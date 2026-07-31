> 演示输入：合成数据，不代表真实客户/生产结果

# 多门店预约系统表结构预览

合成量级：200家门店、日活5万、热门时段峰值每秒300次抢号。

~~~mermaid
erDiagram
  STORE ||--o{ SERVICE : offers
  STORE ||--o{ SLOT : owns
  USER ||--o{ APPOINTMENT : books
  SERVICE ||--o{ APPOINTMENT : selected
  SLOT ||--o{ APPOINTMENT : reserves
~~~

## 核心建表摘录

~~~sql
CREATE TABLE appointment (
  id BIGINT UNSIGNED PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  slot_id BIGINT UNSIGNED NOT NULL,
  service_id BIGINT UNSIGNED NOT NULL,
  status VARCHAR(20) NOT NULL,
  idempotency_key VARCHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  UNIQUE KEY uk_user_slot (user_id, slot_id),
  UNIQUE KEY uk_idempotency (idempotency_key),
  KEY idx_slot_status (slot_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
~~~

设计决定：slot独立存容量与版本号；appointment保留取消记录而非物理删除；价格快照写预约，避免服务改价影响历史。

## 并发

- 抢号：条件更新 available_count>0，affected_rows=1才成功；
- 重复提交：客户端幂等键+唯一索引；
- 超卖：数据库事务为最终门禁，缓存只做削峰；
- 支付超时：预约进入pending并设过期任务释放名额。

正式SQL还需读取需求、确认取消政策、分库需求和数据保留期。本预览不应直接部署生产。
