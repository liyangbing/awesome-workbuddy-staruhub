> 演示输入：合成数据，不代表真实客户/生产结果

# pytest 单元测试预览

合成订单服务规则：金额必须大于0且不超过100万元；相同幂等键只创建一次；支付和数据库均为外部依赖。

~~~python
def test_create_order_success(service, repo, payment):
    """验证合法金额会创建订单并调用一次支付。"""
    repo.find_by_key.return_value = None
    payment.charge.return_value = {"status": "paid"}
    order = service.create(amount=19900, idempotency_key="k-1")
    assert order.status == "paid"
    payment.charge.assert_called_once()

@pytest.mark.parametrize("amount", [0, -1, 100_000_001])
def test_reject_invalid_amount(service, amount):
    """验证零、负数和超大金额被拒绝，且不触达外部依赖。"""
    with pytest.raises(InvalidAmount):
        service.create(amount=amount, idempotency_key="k")

def test_same_key_is_idempotent(service, repo, payment, existing_order):
    """验证重复幂等键返回原订单，不重复扣款。"""
    repo.find_by_key.return_value = existing_order
    assert service.create(19900, "k-1") == existing_order
    payment.charge.assert_not_called()
~~~

| 分支 | 状态 | 原因 |
|---|---|---|
| 正常支付 | 覆盖 | 核心流程 |
| 金额边界 | 覆盖 | 参数红线 |
| 支付超时 | 覆盖 | 异常补偿 |
| 数据库死锁重试 | 未覆盖 | 合成接口未暴露重试策略 |

正式测试需通读 src/order 后按真实签名改写，运行pytest并报告真实覆盖率。Mock只隔离边界，不应把被测对象内部逻辑全部Mock掉。
