# 甄恋 CRM 认证体系执行清单（模块一 2.4 Todo）

> 状态：已完成（规格冻结 + 代码实现），正式冻结输出见 [freeze-zhenlian-certification-v1.md](./freeze-zhenlian-certification-v1.md)  
> 代码产出：
> - `supabase/migrations/014_certification_and_materials.sql` — DB migration
> - `types/database.ts` / `types/app.ts` — 类型定义与标签
> - `actions/certifications.ts` — 服务端操作（CRUD + 审核）
> - `app/api/certification-materials/route.ts` — 认证材料上传 API
> - `components/client/certification-panel.tsx` — 认证 UI 组件  
> 适用范围：甄恋 CRM 当前主线，模块一 `2.4 认证体系` 的执行拆解  
> 依据文档：
> - [甄恋CRM产品重构方案（聚合版）.md](./甄恋CRM产品重构方案（聚合版）.md)
> - [plan-zhenlian-certification-2.4.md](./plan-zhenlian-certification-2.4.md)
> - [freeze-zhenlian-fields-v1.md](./freeze-zhenlian-fields-v1.md)
> - [freeze-zhenlian-data-model-v1.md](./freeze-zhenlian-data-model-v1.md)
> - [freeze-zhenlian-import-and-cards-v1.md](./freeze-zhenlian-import-and-cards-v1.md)
> 说明：这份 `todo` 只负责把认证体系专项方案压成执行顺序，不代替第一阶段总 `todo`。

---

## 0. 当前已确认基线

- [x] `profile_certifications` 对象已在主数据模型冻结 v1 中定义
- [x] `certification_items` 子结构已冻结（type / status / material_refs / reviewed_at / reviewed_by / review_notes）
- [x] 认证材料与 `supplemental_materials` 的关联关系已明确
- [x] 材料语义边界已冻结（头像 / 生活照 / 认证材料 / 补充材料不混用）
- [x] 资料卡三版本中认证信息的展示边界已冻结
- [x] 认证体系详细需求方案已完成（plan-zhenlian-certification-2.4.md）

---

## 1. 认证类型定义冻结

### 1.1 五级认证类型

- [x] 冻结 L1 身份认证（`identity`）的材料要求、验证要点、关联字段
- [x] 冻结 L2 学历认证（`education`）的材料要求、验证要点、关联字段
- [x] 冻结 L3 经济认证-收入（`income`）的材料要求、验证要点、关联字段
- [x] 冻结 L3 经济认证-资产（`assets`）的材料要求、验证要点、关联字段
- [x] 冻结 L4 婚况认证（`marital_history`）的材料要求、验证要点、关联字段
- [x] 冻结 L5 健康认证（`health`）的材料要求、验证要点、有效期规则
- [x] 确认 `certification_items.type` 枚举值覆盖所有认证类型

### 1.2 认证类型与字段关联

- [x] 明确每种认证类型关联的 `customer_profile` 字段 key 列表
- [x] 明确认证通过后对关联字段的影响规则（只校验，不自动覆盖）
- [x] 明确身份证号码等敏感信息不作为正式字段存储的规则

---

## 2. 认证状态流转冻结

### 2.1 状态定义

- [x] 冻结认证状态枚举：`not_submitted / pending_review / verified / rejected / expired`
- [x] 确认 `expired` 状态仅适用于 `health` 类型
- [x] 冻结每个状态的展示文案

### 2.2 状态迁移规则

- [x] 冻结 `not_submitted → pending_review` 的触发条件（上传材料）
- [x] 冻结 `pending_review → verified` 的触发条件（管理员审核通过）
- [x] 冻结 `pending_review → rejected` 的触发条件（管理员审核驳回）
- [x] 冻结 `rejected → pending_review` 的触发条件（重新上传材料）
- [x] 冻结 `verified → expired` 的触发条件（仅健康认证，超过有效期）
- [x] 冻结 `verified → not_submitted` 的触发条件（管理员撤销，极端情况）
- [x] 冻结 `expired → pending_review` 的触发条件（重新上传材料）
- [x] 明确所有状态变更必须记录操作人和操作时间

### 2.3 状态迁移约束

- [x] 明确 `verified → not_submitted` 只允许管理员操作且必须填写撤销原因
- [x] 明确驳回时必须填写驳回原因
- [x] 明确健康认证的有效期规则（建议 6 个月）

---

## 3. 认证对象结构扩展

### 3.1 `certification_items` 扩展字段

- [x] 评审是否需要在已冻结结构基础上新增 `submitted_at`
- [x] 评审是否需要新增 `expires_at`（仅 health 类型）
- [x] 评审是否需要新增 `rejection_reason`
- [x] 评审是否需要新增 `related_field_keys`
- [x] 如需扩展，产出扩展后的完整 `certification_items` 结构定义
- [x] 确认扩展不破坏已冻结的最小结构

---

## 4. 认证审核流程

### 4.1 审核角色与权限

- [x] 冻结审核角色定义：所属红娘（上传）/ 总部管理员（审核）/ 系统（自动检测）
- [x] 明确红娘不能自行审核通过自己客户的认证
- [x] 明确管理员是认证审核的唯一决策方

### 4.2 审核流程

- [x] 冻结完整审核流程：上传 → 创建待审核项 → 通知管理员 → 审核 → 通知红娘
- [x] 明确审核时效建议（身份/婚况 24h，学历/经济 48h，健康 72h）
- [x] 明确超时提醒机制

### 4.3 第一阶段审核最小集合

- [x] 确认第一阶段必须实现：待审核列表、逐项审核、驳回原因、结果通知
- [x] 确认第一阶段不做：自动 OCR、自动比对、批量审核、审核工作台、SLA 监控

---

## 5. 认证展示规则

### 5.1 各界面展示

- [x] 冻结客户列表中认证标签的展示规则（小图标/徽章，最多 3 个）
- [x] 冻结客户详情中认证状态列表的展示规则（每种类型一行）
- [x] 冻结内部完整版资料卡中认证摘要的展示规则
- [x] 冻结对客介绍版资料卡中认证标签的展示规则（只展示"已认证"标签）
- [x] 确认营销版资料卡不展示认证信息

### 5.2 认证标签优先级

- [x] 冻结空间有限时的标签展示优先级：身份 > 婚况 > 学历 > 经济 > 健康

---

## 6. 认证与筛选/匹配联动

### 6.1 筛选面板

- [x] 冻结"认证客户优先"开关的筛选逻辑
- [x] 冻结"按认证类型筛选"的多选逻辑
- [x] 冻结"排除未认证客户"开关的筛选逻辑

### 6.2 匹配联动

- [x] 明确第一阶段认证状态不直接影响匹配分数
- [x] 明确认证标签在匹配结果列表中的展示方式
- [x] 明确认证作为销售工具的使用场景

---

## 7. 数据安全与隐私

- [x] 明确认证材料必须加密存储
- [x] 明确认证材料访问的权限控制规则
- [x] 明确身份证号码等敏感信息不进入 `customer_profile`
- [x] 明确材料查看/下载的操作日志要求
- [x] 明确审核界面的脱敏展示规则（身份证号打码、银行账号打码）
- [x] 明确客户退档后认证材料的保留策略

---

## 8. 与已冻结文档的兼容确认

- [x] 确认认证不新增 `customer_profile` 字段
- [x] 确认认证关联字段只做校验参考，不反向覆盖
- [x] 确认认证对象仍为 `profile_certifications`，不新增顶层对象
- [x] 确认认证材料引用通过 `material_refs` 指向 `supplemental_materials`
- [x] 确认资料卡三版本的认证展示规则与导入冻结 v1 一致

---

## 9. 本专项的完成标准

- [x] 五级认证的每个类型都有正式的 `type / 材料要求 / 验证要点 / 关联字段 / 状态流转`
- [x] 认证状态流转有完整的迁移规则和约束条件
- [x] 审核流程有明确的角色分工和最小能力要求
- [x] 各界面的认证展示规则可直接指导前端实现
- [x] 筛选和匹配的联动逻辑边界清晰
- [x] 与已冻结的三份文档无冲突
- [x] 完成一次"认证体系评审 v1"

---

## 10. 当前顺序约束

- [x] 先完成认证详细需求方案评审
- [x] 再冻结认证类型定义和状态流转
- [x] 再冻结审核流程和展示规则
- [x] 再冻结筛选/匹配联动逻辑
- [x] 本专项完成后，可进入认证相关的 schema 草案推导
- [x] 未完成认证冻结前，不提前跳到认证审核页面实现
