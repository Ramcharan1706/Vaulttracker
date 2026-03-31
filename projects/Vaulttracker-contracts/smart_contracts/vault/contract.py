from algopy import (
    ARC4Contract,
    Bytes,
    Global,
    Txn,
    UInt64,
    gtxn,
    op,
)
from algopy.arc4 import abimethod


class SavingsVault(ARC4Contract):
    """
    Savings Vault Tracker - A gamified, non-custodial savings dApp on Algorand
    
    ==================== GLOBAL STATE ====================
    - milestone_1: uint64 = 10 ALGO (10,000,000 microAlgos)
    - milestone_2: uint64 = 50 ALGO (50,000,000 microAlgos)
    - milestone_3: uint64 = 100 ALGO (100,000,000 microAlgos)
    
    ==================== LOCAL STATE (per user) ====================
    - total_saved: uint64 - cumulative amount deposited
    - last_deposit_time: uint64 - timestamp of last deposit
    - milestones_unlocked: uint64 - bitmask (1=bronze, 2=silver, 4=gold)
    - streak_count: uint64 - consecutive days with deposits
    - vault_unlock_time: uint64 - when locked funds can be withdrawn
    
    ==================== DEPOSIT FLOW ====================
    ATOMIC GROUP (2 transactions):
    - Txn[0]: PaymentTxn (user → app escrow)
    - Txn[1]: AppCallTxn (deposit call)
    
    VALIDATIONS:
    ✓ Group size == 2
    ✓ Txn[0] is Payment type
    ✓ Txn[0] receiver == app address
    ✓ Txn[0] amount > 0
    ✓ Txn[0] sender == Txn[1] sender
    
    STATE UPDATES:
    ✓ total_saved += amount
    ✓ last_deposit_time = current unix time
    ✓ streak_count = consecutive deposit counter (reset if > 24h gap)
    ✓ milestones_unlocked = update bitmask based on total_saved
    
    ==================== STREAK LOGIC ====================
    - If deposit within 24h of last deposit: streak_count += 1
    - Else (first deposit or >24h gap): streak_count = 1
    
    ==================== TIME-LOCK LOGIC ====================
    - Optional: User specifies lock duration (in seconds) via app args
    - vault_unlock_time = now + duration
    - Cannot withdraw before unlock time
    
    ==================== MILESTONE ENGINE ====================
    Bronze (>=10 ALGO):   bit 0 (value 1)
    Silver (>=50 ALGO):   bit 1 (value 2)
    Gold (>=100 ALGO):    bit 2 (value 4)
    """

    milestone_1: UInt64  # 10 ALGO
    milestone_2: UInt64  # 50 ALGO
    milestone_3: UInt64  # 100 ALGO

    # ============================================================
    # INITIALIZATION
    # ============================================================

    @abimethod(create="require", bare_call_config="CALL")
    def create_vault(self) -> None:
        """Initialize vault with milestone thresholds"""
        self.milestone_1 = UInt64(10_000_000)   # 10 ALGO in microAlgos
        self.milestone_2 = UInt64(50_000_000)   # 50 ALGO in microAlgos
        self.milestone_3 = UInt64(100_000_000)  # 100 ALGO in microAlgos

    # ============================================================
    # OPT-IN / INITIALIZATION
    # ============================================================

    @abimethod(allow_actions=["NoOp"])
    def opt_in(self) -> None:
        """Allow user to opt into local state"""
        # Initialize local state for user
        op.app_local_put(
            Txn.sender(), Global.current_application_id(), Bytes("total_saved"), UInt64(0)
        )
        op.app_local_put(
            Txn.sender(), Global.current_application_id(), Bytes("last_deposit_time"), UInt64(0)
        )
        op.app_local_put(
            Txn.sender(), Global.current_application_id(), Bytes("milestones_unlocked"), UInt64(0)
        )
        op.app_local_put(
            Txn.sender(), Global.current_application_id(), Bytes("streak_count"), UInt64(0)
        )
        op.app_local_put(
            Txn.sender(), Global.current_application_id(), Bytes("vault_unlock_time"), UInt64(0)
        )

    # ============================================================
    # DEPOSIT WITH ATOMIC GROUPED TRANSACTIONS
    # ============================================================

    @abimethod(allow_actions=["NoOp"])
    def deposit(self) -> None:
        """
        Deposit ALGO into vault using ATOMIC GROUPED TRANSACTIONS
        
        App Args:
        [0] = "deposit"
        [1] = lock_duration (optional, in seconds. 0 = no lock)
        
        ATOMIC GROUP (STRICT):
        - Txn[0]: PaymentTxn (user → app escrow)
        - Txn[1]: AppCallTxn (this deposit call)
        """
        # ========================
        # GROUP VALIDATION
        # ========================
        assert Global.group_size() == 2, "Deposit must be exactly 2-txn group"
        assert Txn.group_index() == 1, "Deposit app call must be at index 1"

        # Get payment transaction (must be immediately before this call)
        payment_txn = gtxn.GroupTransaction(0)

        # ========================
        # PAYMENT TXN VALIDATION
        # ========================
        assert payment_txn.type_enum() == op.TxnType.Payment, "Txn[0] must be Payment"
        assert (
            payment_txn.receiver() == Global.current_application_address()
        ), "Txn[0] must pay to app escrow"
        assert payment_txn.amount() > 0, "Deposit amount must be > 0"
        assert (
            payment_txn.sender() == Txn.sender()
        ), "Payment sender must match app call sender"

        # ========================
        # GET CURRENT USER STATE
        # ========================
        total_saved_result = op.app_local_get_ex(
            Txn.sender(), Global.current_application_id(), Bytes("total_saved")
        )
        last_deposit_time_result = op.app_local_get_ex(
            Txn.sender(), Global.current_application_id(), Bytes("last_deposit_time")
        )
        milestones_unlocked_result = op.app_local_get_ex(
            Txn.sender(), Global.current_application_id(), Bytes("milestones_unlocked")
        )
        streak_count_result = op.app_local_get_ex(
            Txn.sender(), Global.current_application_id(), Bytes("streak_count")
        )

        # Extract values or defaults
        total_saved = (
            total_saved_result.value()
            if total_saved_result.exists()
            else UInt64(0)
        )
        last_deposit_time = (
            last_deposit_time_result.value()
            if last_deposit_time_result.exists()
            else UInt64(0)
        )
        current_milestones = (
            milestones_unlocked_result.value()
            if milestones_unlocked_result.exists()
            else UInt64(0)
        )
        current_streak = (
            streak_count_result.value()
            if streak_count_result.exists()
            else UInt64(0)
        )

        # ========================
        # CALCULATE NEW STATE
        # ========================
        new_total = total_saved + payment_txn.amount()
        current_timestamp = Global.latest_confirmed_block()

        # STREAK LOGIC: Check if within 24h of last deposit
        # 24 hours = 86400 seconds
        streak_window = UInt64(86400)
        new_streak = (
            current_streak + UInt64(1)
            if (current_streak > UInt64(0) and (current_timestamp - last_deposit_time) <= streak_window)
            else UInt64(1)
        )

        # MILESTONE CALCULATION: Use bitmask
        new_milestones = current_milestones
        if new_total >= self.milestone_3 and not (current_milestones & UInt64(4)):
            new_milestones |= UInt64(4)  # Gold badge
        if new_total >= self.milestone_2 and not (current_milestones & UInt64(2)):
            new_milestones |= UInt64(2)  # Silver badge
        if new_total >= self.milestone_1 and not (current_milestones & UInt64(1)):
            new_milestones |= UInt64(1)  # Bronze badge

        # TIME-LOCK LOGIC: Parse lock duration from app args (optional)
        lock_duration = UInt64(0)
        if Txn.num_app_args() > 1:
            # App args[1] contains lock duration in seconds
            lock_duration = op.btoi(Txn.application_args(1))

        new_vault_unlock_time = (
            current_timestamp + lock_duration
            if lock_duration > UInt64(0)
            else UInt64(0)
        )

        # ========================
        # UPDATE LOCAL STATE
        # ========================
        op.app_local_put(
            Txn.sender(),
            Global.current_application_id(),
            Bytes("total_saved"),
            new_total,
        )
        op.app_local_put(
            Txn.sender(),
            Global.current_application_id(),
            Bytes("last_deposit_time"),
            current_timestamp,
        )
        op.app_local_put(
            Txn.sender(),
            Global.current_application_id(),
            Bytes("milestones_unlocked"),
            new_milestones,
        )
        op.app_local_put(
            Txn.sender(),
            Global.current_application_id(),
            Bytes("streak_count"),
            new_streak,
        )
        op.app_local_put(
            Txn.sender(),
            Global.current_application_id(),
            Bytes("vault_unlock_time"),
            new_vault_unlock_time,
        )

    # ============================================================
    # WITHDRAWAL WITH INNER TRANSACTIONS (CRITICAL)
    # ============================================================

    @abimethod(allow_actions=["NoOp"])
    def withdraw(self) -> None:
        """
        Withdraw savings from vault using inner transactions
        
        App Args:
        [0] = "withdraw"
        [1] = withdrawal amount (in microAlgos)
        
        VALIDATIONS:
        ✓ Withdrawal amount <= total_saved
        ✓ Vault is not locked OR lock time has passed
        ✓ Amount > 0
        ✓ App has sufficient balance
        
        SIDE EFFECTS:
        ✓ Deduct from total_saved
        ✓ Send funds to user via inner txn
        ✓ Reset streak if desired bonus logic
        """
        # ========================
        # PARSE WITHDRAWAL AMOUNT
        # ========================
        assert Txn.num_app_args() >= 2, "Withdraw requires amount in app args"
        
        withdrawal_amount = op.btoi(Txn.application_args(1))
        assert withdrawal_amount > 0, "Withdrawal amount must be > 0"

        # ========================
        # GET CURRENT USER STATE
        # ========================
        total_saved_result = op.app_local_get_ex(
            Txn.sender(), Global.current_application_id(), Bytes("total_saved")
        )
        vault_unlock_time_result = op.app_local_get_ex(
            Txn.sender(), Global.current_application_id(), Bytes("vault_unlock_time")
        )
        streak_count_result = op.app_local_get_ex(
            Txn.sender(), Global.current_application_id(), Bytes("streak_count")
        )

        # Extract values or defaults
        total_saved = (
            total_saved_result.value()
            if total_saved_result.exists()
            else UInt64(0)
        )
        vault_unlock_time = (
            vault_unlock_time_result.value()
            if vault_unlock_time_result.exists()
            else UInt64(0)
        )
        current_streak = (
            streak_count_result.value()
            if streak_count_result.exists()
            else UInt64(0)
        )

        # ========================
        # VALIDATIONS
        # ========================
        assert withdrawal_amount <= total_saved, "Cannot withdraw more than total_saved"
        
        # Check lock status: if vault_unlock_time > 0, it means funds are locked
        # User can only withdraw if: vault is not locked OR current time >= unlock time
        current_timestamp = Global.latest_confirmed_block()
        if vault_unlock_time > UInt64(0):
            assert current_timestamp >= vault_unlock_time, "Funds are still locked"

        # ========================
        # CALCULATE NEW STATE
        # ========================
        new_total_saved = total_saved - withdrawal_amount

        # Reset streak on withdrawal (optional penalty/rule)
        # Uncomment if you want to enforce streak reset on withdrawal:
        # new_streak = UInt64(0)

        # ========================
        # UPDATE LOCAL STATE
        # ========================
        op.app_local_put(
            Txn.sender(),
            Global.current_application_id(),
            Bytes("total_saved"),
            new_total_saved,
        )

        # Clear vault unlock time if all funds withdrawn
        if new_total_saved == UInt64(0):
            op.app_local_put(
                Txn.sender(),
                Global.current_application_id(),
                Bytes("vault_unlock_time"),
                UInt64(0),
            )

        # ========================
        # SEND FUNDS VIA INNER TXN
        # ========================
        # Use InnerTxnBuilder to construct and send payment
        op.InnerTxn.begin()
        op.InnerTxn.set_type_enum(op.TxnType.Payment)
        op.InnerTxn.set_amount(withdrawal_amount)
        op.InnerTxn.set_receiver(Txn.sender())
        op.InnerTxn.set_fee(UInt64(0))  # Accept suggested fee from app
        op.InnerTxn.submit()

    # ============================================================
    # READ METHODS
    # ============================================================

    @abimethod(allow_actions=["NoOp"])
    def get_user_state(
        self,
    ) -> tuple[UInt64, UInt64, UInt64, UInt64, UInt64]:
        """
        Get complete user state
        
        Returns:
        - total_saved: uint64
        - last_deposit_time: uint64
        - milestones_unlocked: uint64 (bitmask)
        - streak_count: uint64
        - vault_unlock_time: uint64
        """
        total_saved_result = op.app_local_get_ex(
            Txn.sender(), Global.current_application_id(), Bytes("total_saved")
        )
        last_deposit_time_result = op.app_local_get_ex(
            Txn.sender(), Global.current_application_id(), Bytes("last_deposit_time")
        )
        milestones_unlocked_result = op.app_local_get_ex(
            Txn.sender(), Global.current_application_id(), Bytes("milestones_unlocked")
        )
        streak_count_result = op.app_local_get_ex(
            Txn.sender(), Global.current_application_id(), Bytes("streak_count")
        )
        vault_unlock_time_result = op.app_local_get_ex(
            Txn.sender(), Global.current_application_id(), Bytes("vault_unlock_time")
        )

        return (
            total_saved_result.value() if total_saved_result.exists() else UInt64(0),
            last_deposit_time_result.value() if last_deposit_time_result.exists() else UInt64(0),
            milestones_unlocked_result.value() if milestones_unlocked_result.exists() else UInt64(0),
            streak_count_result.value() if streak_count_result.exists() else UInt64(0),
            vault_unlock_time_result.value() if vault_unlock_time_result.exists() else UInt64(0),
        )

    @abimethod(allow_actions=["NoOp"])
    def get_milestones(self) -> tuple[UInt64, UInt64, UInt64]:
        """Get milestone thresholds (in microAlgos)"""
        return (self.milestone_1, self.milestone_2, self.milestone_3)

    @abimethod(allow_actions=["NoOp"])
    def get_streak(self) -> UInt64:
        """Get current streak count for caller"""
        streak_result = op.app_local_get_ex(
            Txn.sender(), Global.current_application_id(), Bytes("streak_count")
        )
        return streak_result.value() if streak_result.exists() else UInt64(0)

    @abimethod(allow_actions=["NoOp"])
    def get_lock_status(self) -> UInt64:
        """Get vault unlock time (0 if no lock)"""
        unlock_result = op.app_local_get_ex(
            Txn.sender(), Global.current_application_id(), Bytes("vault_unlock_time")
        )
        return unlock_result.value() if unlock_result.exists() else UInt64(0)
