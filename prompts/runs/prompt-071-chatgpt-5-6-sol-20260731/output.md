> 演示输入：合成数据，不代表真实客户/生产结果

# Python 后端架构说明预览

合成项目由 api、services、repositories、models 四层组成。以下路径与行号只属于演示输入，不对应真实代码。

~~~mermaid
flowchart TD
  A["api/orders.py"] --> B["services/order_service.py"]
  B --> C["repositories/order_repo.py"]
  B --> D["clients/payment.py"]
  C --> E[("PostgreSQL")]
~~~

| 模块 | 输入 | 输出 | 关键逻辑 | 证据 |
|---|---|---|---|---|
| api/orders.py | HTTP JSON | OrderResponse | 参数校验、鉴权 | L18—74 |
| order_service.py | CreateOrder | Order | 幂等、库存、支付 | L22—133 |
| order_repo.py | Order实体 | 数据库行 | 事务写入 | L14—91 |
| payment.py | 支付请求 | 上游结果 | 超时与重试 | L31—88 |

## 调用链说明

POST /orders 先用 idempotency_key 查重，再开启事务创建订单；支付客户端失败时不删除订单，而写为 payment_pending 供补偿任务处理。是否允许“先扣库存后支付”在合成代码中未见业务说明，标为待确认。

## 新手上手

~~~bash
python -m venv .venv
pip install -r requirements.txt
cp .env.example .env
pytest
uvicorn app.main:app --reload
~~~

常见坑：数据库迁移未执行；测试环境误用生产支付地址；本地时区与UTC混用。正式文档必须通读真实代码，并给每个结论标真实路径与行号；没有证据的逻辑只能写待确认。
