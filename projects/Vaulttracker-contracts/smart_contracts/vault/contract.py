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
    @abimethod(create="require", bare_call_config="CALL")
    def create_vault(self) -> None:
        pass

    @abimethod(allow_actions=["NoOp"])
    def opt_in(self) -> None:
        op.app_local_put(Txn.sender(), Global.current_application_id(), Bytes("total_saved"), UInt64(0))
        op.app_local_put(Txn.sender(), Global.current_application_id(), Bytes("streak_count"), UInt64(0))
        op.app_local_put(Txn.sender(), Global.current_application_id(), Bytes("last_deposit_time"), UInt64(0))
        op.app_local_put(Txn.sender(), Global.current_application_id(), Bytes("milestones_unlocked"), UInt64(0))

    @abimethod(allow_actions=["NoOp"])
    def deposit(self) -> None:
        assert Global.group_size() == 2
        assert Txn.group_index() == 1
        
        payment_txn = gtxn.GroupTransaction(0)
        
        assert payment_txn.type_enum() == op.TxnType.Payment
        assert payment_txn.receiver() == Global.current_application_address()
        assert payment_txn.amount() > 0
        assert payment_txn.sender() == Txn.sender()
        assert payment_txn.rekey_to() == Global.zero_address()
        assert payment_txn.close_remainder_to() == Global.zero_address()

        total_saved_result = op.app_local_get_ex(
            Txn.sender(), Global.current_application_id(), Bytes("total_saved")
        )
        
        total_saved = total_saved_result.value() if total_saved_result.exists() else UInt64(0)
        new_total = total_saved + payment_txn.amount()

        op.app_local_put(
            Txn.sender(),
            Global.current_application_id(),
            Bytes("total_saved"),
            new_total,
        )
        
        # Update streak tracking
        now = Global.latest_confirmed_block_timestamp()
        last_deposit_result = op.app_local_get_ex(
            Txn.sender(), Global.current_application_id(), Bytes("last_deposit_time")
        )
        last_deposit = last_deposit_result.value() if last_deposit_result.exists() else UInt64(0)
        
        streak_result = op.app_local_get_ex(
            Txn.sender(), Global.current_application_id(), Bytes("streak_count")
        )
        streak_count = streak_result.value() if streak_result.exists() else UInt64(0)
        
        # If last deposit was within 24 hours, increment streak
        if now - last_deposit <= 86400:
            streak_count += 1
        else:
            streak_count = UInt64(1)
        
        op.app_local_put(Txn.sender(), Global.current_application_id(), Bytes("last_deposit_time"), now)
        op.app_local_put(Txn.sender(), Global.current_application_id(), Bytes("streak_count"), streak_count)
        
        # Update milestones
        milestones = op.app_local_get_ex(
            Txn.sender(), Global.current_application_id(), Bytes("milestones_unlocked")
        )
        milestone_flags = milestones.value() if milestones.exists() else UInt64(0)
        
        # Bronze: 1 ALGO (1_000_000 microAlgos)
        if new_total >= 1_000_000:
            milestone_flags = milestone_flags | 1
        # Silver: 5 ALGO (5_000_000 microAlgos)
        if new_total >= 5_000_000:
            milestone_flags = milestone_flags | 2
        # Gold: 10 ALGO (10_000_000 microAlgos)
        if new_total >= 10_000_000:
            milestone_flags = milestone_flags | 4
        
        op.app_local_put(Txn.sender(), Global.current_application_id(), Bytes("milestones_unlocked"), milestone_flags)
        
        op.log(b"DEPOSIT")
        op.log(op.itob(payment_txn.amount()))

    @abimethod(allow_actions=["NoOp"])
    def withdraw(self) -> None:
        assert Txn.num_app_args() >= 2
        
        withdrawal_amount = op.btoi(Txn.application_args(1))
        assert withdrawal_amount > 0

        total_saved_result = op.app_local_get_ex(
            Txn.sender(), Global.current_application_id(), Bytes("total_saved")
        )

        total_saved = total_saved_result.value() if total_saved_result.exists() else UInt64(0)
        assert withdrawal_amount <= total_saved

        new_total_saved = total_saved - withdrawal_amount

        op.app_local_put(
            Txn.sender(),
            Global.current_application_id(),
            Bytes("total_saved"),
            new_total_saved,
        )
        
        # Recalculate milestones after withdrawal
        milestones = op.app_local_get_ex(
            Txn.sender(), Global.current_application_id(), Bytes("milestones_unlocked")
        )
        milestone_flags = milestones.value() if milestones.exists() else UInt64(0)
        
        # Recalculate milestone status
        new_flags = UInt64(0)
        if new_total_saved >= 1_000_000:
            new_flags = new_flags | 1
        if new_total_saved >= 5_000_000:
            new_flags = new_flags | 2
        if new_total_saved >= 10_000_000:
            new_flags = new_flags | 4
        
        op.app_local_put(Txn.sender(), Global.current_application_id(), Bytes("milestones_unlocked"), new_flags)

        op.InnerTxn.begin()
        op.InnerTxn.set_type_enum(op.TxnType.Payment)
        op.InnerTxn.set_amount(withdrawal_amount)
        op.InnerTxn.set_receiver(Txn.sender())
        op.InnerTxn.set_fee(UInt64(0))
        op.InnerTxn.set_rekey_to(Global.zero_address())
        op.InnerTxn.set_close_remainder_to(Global.zero_address())
        op.InnerTxn.submit()
        
        op.log(b"WITHDRAW")
        op.log(op.itob(withdrawal_amount))

    @abimethod(allow_actions=["NoOp"])
    def get_total_saved(self) -> UInt64:
        total_saved_result = op.app_local_get_ex(
            Txn.sender(), Global.current_application_id(), Bytes("total_saved")
        )
        return total_saved_result.value() if total_saved_result.exists() else UInt64(0)

    @abimethod(allow_actions=["NoOp"])
    def get_streak_count(self) -> UInt64:
        streak_result = op.app_local_get_ex(
            Txn.sender(), Global.current_application_id(), Bytes("streak_count")
        )
        return streak_result.value() if streak_result.exists() else UInt64(0)

    @abimethod(allow_actions=["NoOp"])
    def get_last_deposit_time(self) -> UInt64:
        time_result = op.app_local_get_ex(
            Txn.sender(), Global.current_application_id(), Bytes("last_deposit_time")
        )
        return time_result.value() if time_result.exists() else UInt64(0)

    @abimethod(allow_actions=["NoOp"])
    def get_milestones_unlocked(self) -> UInt64:
        milestones_result = op.app_local_get_ex(
            Txn.sender(), Global.current_application_id(), Bytes("milestones_unlocked")
        )
        return milestones_result.value() if milestones_result.exists() else UInt64(0)
