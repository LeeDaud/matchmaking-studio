# 甄恋 CRM 认证体系冻结包 v1

> 状态：`v1` 冻结，可引用  
> 适用范围：甄恋 CRM 当前主线，模块一 `2.4 认证体系`  
> 上游文档：
> - [甄恋CRM产品重构方案（聚合版）.md](./甄恋CRM产品重构方案（聚合版）.md)
> - [plan-zhenlian-certification-2.4.md](./plan-zhenlian-certification-2.4.md)
> - [freeze-zhenlian-fields-v1.md](./freeze-zhenlian-fields-v1.md)
> - [freeze-zhenlian-data-model-v1.md](./freeze-zhenlian-data-model-v1.md)
> - [freeze-zhenlian-import-and-cards-v1.md](./freeze-zhenlian-import-and-cards-v1.md)
> - [todo-zhenlian-certification-2.4.md](./todo-zhenlian-certification-2.4.md)
> 说明：本文是认证体系专项的正式输出包，一次性给出 `认证类型字典 v1`、`认证状态流转矩阵 v1`、`认证对象结构 v1`、`审核流程 v1`、`展示规则 v1`、`筛选联动 v1`、`数据安全规则 v1` 和 `冻结评审结论 v1`。

---

## 一、冻结结论

这次 `v1` 冻结明确了 7 件事：

1. 五级认证类型已形成正式字典，每种类型有明确的材料要求、验证要点和关联字段
2. 认证状态已从原四状态扩展为五状态（新增 `expired`），迁移规则和约束条件已固定
3. `certification_items` 子结构已在已冻结最小结构基础上完成扩展，新增 4 个字段
4. 审核流程已固定角色分工（红娘上传 / 管理员审核 / 系统自动检测），第一阶段最小集合已明确
5. 认证在各界面的展示规则已固定，标签优先级已排序
6. 认证与筛选/匹配的联动逻辑已固定，第一阶段不做认证加权匹配分
7. 数据安全与隐私规则已固定，敏感信息不进入 `customer_profile`

本文件之后，模块一 `2.4` 的 source of truth 以本文为准；上游 `plan` 负责解释为什么这样设计，本文负责定义到底落什么。

---

## 二、认证类型字典 v1

### 2.1 类型总表

| 认证类型 key | 中文名 | 等级 | 业务目的 | 适用阶段 | 有效期 |
|------|------|------|------|------|------|
| `identity` | 身份认证 | L1 基础 | 确认客户真实身份，防止虚假注册 | 所有客户建议完成 | 无限期 |
| `education` | 学历认证 | L2 | 验证学历真实性，高净值场景核心信任要素 | 首轮补齐建议 | 无限期 |
| `income` | 收入认证 | L3 经济 | 验证收入真实性，支撑条件匹配可信度 | 递进补全 | 无限期 |
| `assets` | 资产认证 | L3 经济 | 验证资产真实性，支撑条件匹配可信度 | 递进补全 | 无限期 |
| `marital_history` | 婚况认证 | L4 | 验证婚姻状况真实性，防投诉核心手段 | 首轮补齐建议 | 无限期 |
| `health` | 健康认证 | L5 | 高端服务专用，验证婚检或健康状况 | 仅高端服务 | 6 个月 |
| `other` | 其他认证 | - | 预留扩展 | 按需 | 无限期 |

### 2.2 各类型材料要求与关联字段

#### `identity` 身份认证

| 项目 | 冻结值 |
|------|------|
| 必要材料 | 身份证正反面照片 |
| 可选补充 | 护照首页 |
| 验证要点 | 姓名与 `full_name` 一致、照片与本人一致 |
| 关联字段 keys | `full_name`、`gender`、`birth_year_month` |
| 关联规则 | 只做校验参考，不自动覆盖正式字段值 |
| 敏感处理 | 身份证号码不作为正式字段存储在 `customer_profile` 中，仅作为认证材料留存 |

#### `education` 学历认证

| 项目 | 冻结值 |
|------|------|
| 必要材料 | 学信网截图 或 毕业证照片（至少一项） |
| 可选补充 | 学位证照片、海外学历认证书 |
| 验证要点 | 学历层级与 `education_level` 一致、院校名与对应学校字段一致 |
| 关联字段 keys | `education_level`、`bachelor_school`、`master_school`、`doctor_school` |
| 关联规则 | 只做校验参考，不自动覆盖正式字段值 |
| 特殊规则 | 多学历（本硕博）可分别提交，每个层级独立验证 |

#### `income` 收入认证

| 项目 | 冻结值 |
|------|------|
| 必要材料 | 工资流水截图 或 纳税证明 或 公司开具的收入证明（至少一项） |
| 可选补充 | 股权证明、分红记录 |
| 验证要点 | 收入水平与 `monthly_income` / `annual_income` 大致匹配（允许区间匹配，不要求精确到元） |
| 关联字段 keys | `monthly_income`、`annual_income`、`income_source_type` |
| 关联规则 | 只做校验参考，不自动覆盖正式字段值 |
| 特殊规则 | 自营收入可用营业执照 + 流水替代 |

#### `assets` 资产认证

| 项目 | 冻结值 |
|------|------|
| 必要材料 | 房产证照片 或 车辆行驶证照片 或 金融资产证明（至少一项） |
| 可选补充 | 车险保单、理财账户截图、保险保单 |
| 验证要点 | 资产类型与对应字段一致 |
| 关联字段 keys | `has_property`、`property_count`、`has_vehicle`、`vehicle_brand`、`vehicle_model`、`family_asset_band` |
| 关联规则 | 只做校验参考，不自动覆盖正式字段值 |
| 特殊规则 | 房产和车辆可分别提交；金融资产第一阶段只做材料留存，不做精确验证 |

#### `marital_history` 婚况认证

| 项目 | 冻结值 |
|------|------|
| 必要材料 | 户口本婚姻状况页 或 离婚证照片 或 法院判决书（至少一项） |
| 可选补充 | 民政局开具的单身证明 |
| 验证要点 | 婚姻状况与 `marital_history` 一致 |
| 关联字段 keys | `marital_history` |
| 关联规则 | 只做校验参考，不自动覆盖正式字段值 |
| 特殊规则 | 未婚客户可用户口本"未婚"状态页验证；离异客户必须提供离婚证或判决书 |

#### `health` 健康认证

| 项目 | 冻结值 |
|------|------|
| 必要材料 | 婚检报告 或 体检报告（三个月内） |
| 可选补充 | 专项检查报告 |
| 验证要点 | 报告真实性、时效性 |
| 关联字段 keys | 无直接关联字段 |
| 关联规则 | 不关联正式字段 |
| 特殊规则 | 仅高端服务客户需要；报告有效期 6 个月；过期后状态自动降级为 `expired` |

### 2.3 关联规则总约束

- 认证通过后对关联字段的影响：**只校验，不自动覆盖**
- 认证不新增 `customer_profile` 字段
- 身份证号码、银行账号等敏感信息不作为正式字段存储
- 认证状态不进入字段字典的 `P0-P3` 分层，独立在 `P4` 层

---

## 三、认证状态流转矩阵 v1

### 3.1 状态枚举

| 状态 | 存储值 | 展示值 | 说明 |
|------|------|------|------|
| 未提交 | `not_submitted` | 未认证 | 初始状态，客户尚未提交任何材料 |
| 待审核 | `pending_review` | 审核中 | 材料已上传，等待审核人员处理 |
| 已通过 | `verified` | 已认证 | 审核通过，认证有效 |
| 已驳回 | `rejected` | 未通过 | 审核未通过，需重新提交 |
| 已过期 | `expired` | 已过期 | 认证曾通过但已超过有效期（仅 `health` 类型适用） |

### 3.2 状态迁移矩阵

| 起始状态 | 目标状态 | 触发条件 | 操作主体 | 约束 |
|------|------|------|------|------|
| `not_submitted` | `pending_review` | 上传认证材料 | 红娘 | 必须上传至少一份材料 |
| `pending_review` | `verified` | 管理员审核通过 | 总部管理员 | 必须记录审核人和时间 |
| `pending_review` | `rejected` | 管理员审核驳回 | 总部管理员 | 必须填写驳回原因 |
| `pending_review` | `not_submitted` | 客户/红娘撤回材料 | 红娘 | 材料引用清空 |
| `rejected` | `pending_review` | 重新上传材料 | 红娘 | 旧驳回原因保留可查 |
| `verified` | `expired` | 超过有效期 | 系统自动 | 仅 `health` 类型，有效期 6 个月 |
| `verified` | `not_submitted` | 管理员撤销认证 | 总部管理员 | 仅极端情况（发现造假），必须填写撤销原因 |
| `expired` | `pending_review` | 重新上传材料 | 红娘 | 重新进入审核流程 |

### 3.3 状态迁移约束

- `expired` 状态仅适用于 `health` 类型认证，其他类型无有效期限制
- `verified → not_submitted` 只允许总部管理员操作，且必须填写撤销原因
- 驳回时必须填写驳回原因（`rejection_reason` 不可为空）
- 所有状态变更必须记录操作人（`reviewed_by`）和操作时间（`reviewed_at`）
- 健康认证有效期固定为 6 个月，从 `reviewed_at` 起算，到期日写入 `expires_at`

---

## 四、认证对象结构 v1

### 4.1 扩展后的 `certification_items` 完整结构

在已冻结最小结构基础上，新增 4 个字段（`submitted_at`、`expires_at`、`rejection_reason`、`related_field_keys`），完整结构如下：

```ts
{
  // === 已冻结字段（保持不变）===
  type: 'identity' | 'education' | 'income' | 'assets' | 'marital_history' | 'health' | 'other'
  status: 'not_submitted' | 'pending_review' | 'verified' | 'rejected' | 'expired'
  material_refs: string[]
  reviewed_at: string | null
  reviewed_by: string | null
  review_notes: string | null

  // === v1 扩展字段 ===
  submitted_at: string | null        // 材料提交时间，status 进入 pending_review 时写入
  expires_at: string | null           // 认证过期时间，仅 health 类型，verified 时由系统计算写入
  rejection_reason: string | null     // 驳回原因，rejected 时必填
  related_field_keys: string[]        // 关联的正式字段 key 列表，按认证类型固定
}
```

### 4.2 扩展兼容性确认

- `status` 枚举新增 `expired`，不影响已有四状态的语义
- 4 个新增字段均为 nullable 或空数组，不破坏已冻结的最小结构
- `related_field_keys` 的值域限定为冻结字段字典中的正式 key，不允许自行发明
- 认证对象仍为 `profile_certifications`，不新增顶层对象
- 认证材料引用仍通过 `material_refs` 指向 `profile_materials.supplemental_materials`

### 4.3 各类型的 `related_field_keys` 固定值

| 认证类型 | `related_field_keys` |
|------|------|
| `identity` | `['full_name', 'gender', 'birth_year_month']` |
| `education` | `['education_level', 'bachelor_school', 'master_school', 'doctor_school']` |
| `income` | `['monthly_income', 'annual_income', 'income_source_type']` |
| `assets` | `['has_property', 'property_count', 'has_vehicle', 'vehicle_brand', 'vehicle_model', 'family_asset_band']` |
| `marital_history` | `['marital_history']` |
| `health` | `[]` |
| `other` | `[]` |

---

## 五、审核流程 v1

### 5.1 审核角色与权限

| 角色 | 可执行操作 | 不可执行操作 |
|------|------|------|
| 所属红娘 | 上传材料、查看认证状态、撤回待审核材料 | 不能自行审核通过自己客户的认证 |
| 总部管理员 | 审核通过、审核驳回、撤销已通过认证 | - |
| 系统 | 自动检测健康认证过期、自动发送审核提醒 | 不做自动审核决策 |

### 5.2 审核流程

```
红娘上传客户认证材料
  ↓
系统自动创建/更新 certification_item
  status = pending_review
  submitted_at = 当前时间
  material_refs = [上传文件引用]
  ↓
系统通知总部管理员有新的待审核认证
  ↓
管理员查看材料，核对关联字段（related_field_keys）
  ├─ 通过 → status = verified
  │         reviewed_at = 当前时间
  │         reviewed_by = 管理员 ID
  │         review_notes = 审核备注（可选）
  │         expires_at = reviewed_at + 6个月（仅 health 类型）
  │
  └─ 驳回 → status = rejected
            reviewed_at = 当前时间
            reviewed_by = 管理员 ID
            rejection_reason = 驳回原因（必填）
            review_notes = 审核备注（可选）
  ↓
系统通知所属红娘审核结果
  ↓
（如驳回）红娘可重新上传材料 → status 回到 pending_review
```

### 5.3 审核时效建议

| 认证类型 | 建议审核时效 | 超时处理 |
|------|------|------|
| `identity` | 24 小时内 | 超时提醒管理员 |
| `education` | 48 小时内 | 超时提醒管理员 |
| `income` | 48 小时内 | 超时提醒管理员 |
| `assets` | 48 小时内 | 超时提醒管理员 |
| `marital_history` | 24 小时内 | 超时提醒管理员 |
| `health` | 72 小时内 | 超时提醒管理员 |

### 5.4 第一阶段审核最小集合

**必须实现：**

- 管理员可查看待审核列表
- 管理员可逐项审核通过或驳回
- 驳回时必须填写 `rejection_reason`
- 审核结果通知到所属红娘

**明确不做：**

- 自动 OCR 识别材料内容
- 自动比对材料与字段值
- 批量审核
- 审核工作台（管理员专用界面）
- 审核 SLA 监控

---

## 六、展示规则 v1

### 6.1 各界面展示规则

| 界面 | 展示内容 | 展示形式 | 可见的认证状态 |
|------|------|------|------|
| 客户列表 | 已通过的认证类型标签 | 小图标/徽章，最多 3 个 | 仅 `verified` |
| 客户详情 | 完整认证状态列表 | 认证卡片区，每种类型一行 | 全部状态 |
| 内部完整版资料卡 | 已通过的认证摘要 | 认证区块，列出已认证项目+认证时间 | 仅 `verified` |
| 对客介绍版资料卡 | 已通过的认证标签 | 信任标签，只展示"已认证" | 仅 `verified` |
| 营销版资料卡 | 不展示 | - | - |
| 匹配列表 | 已通过的认证标签 | 筛选标签 | 仅 `verified` |

### 6.2 认证标签展示优先级

当空间有限时（如列表卡片最多展示 3 个），按以下优先级排序：

1. `identity` 身份认证（最基础的信任基石）
2. `marital_history` 婚况认证（防投诉核心）
3. `education` 学历认证（高净值场景高频关注）
4. `income` 收入认证（条件匹配可信度）
5. `assets` 资产认证（条件匹配可信度）
6. `health` 健康认证（仅高端服务）

### 6.3 展示约束

- 认证材料本身不对客展示，只展示认证结论标签
- 未认证不等于信息不可信，只是缺少额外验证
- 对客资料卡只展示 `verified` 状态的认证标签，不展示 `pending_review` / `rejected` / `expired`
- 营销版资料卡不展示任何认证信息

---

## 七、筛选与匹配联动 v1

### 7.1 筛选面板

| 筛选项 | 类型 | 逻辑 |
|------|------|------|
| 认证客户优先 | 开关 | 开启后，至少有一项 `verified` 认证的客户排序靠前 |
| 按认证类型筛选 | 多选 | 可选择只看"已通过身份认证"、"已通过学历认证"等，多选为 AND 关系 |
| 排除未认证客户 | 开关 | 开启后，完全排除无任何 `verified` 认证的客户 |

### 7.2 匹配联动

- 第一阶段认证状态**不直接影响匹配分数计算**
- 匹配结果列表中，已认证客户可获得"已认证"标签加持
- 红娘推介时可引用认证结论增强说服力
- 认证完成度可作为红娘 KPI 参考指标之一

---

## 八、数据安全规则 v1

### 8.1 材料存储安全

- 认证材料必须加密存储
- 认证材料的访问必须有权限控制（仅所属红娘和管理员可查看）
- 身份证号码等敏感信息不进入 `customer_profile`
- 认证材料的下载/查看必须记录操作日志

### 8.2 材料展示脱敏

- 身份证照片在审核界面展示时，身份证号码中间部分应打码
- 收入证明中的银行账号应打码
- 对客资料卡只展示认证结论标签，不展示任何材料内容

### 8.3 材料保留策略

- 认证通过后，材料保留用于争议追溯
- 客户退档后，认证材料保留期限遵循法律要求（建议至少 3 年）
- 客户主动要求删除时，需评估法律合规后处理

---

## 九、与已冻结文档的兼容确认

| 兼容项 | 确认结果 |
|------|------|
| 认证不新增 `customer_profile` 字段 | ✅ 确认 |
| 认证关联字段只做校验参考，不反向覆盖 | ✅ 确认 |
| 认证对象仍为 `profile_certifications`，不新增顶层对象 | ✅ 确认 |
| 认证材料引用通过 `material_refs` 指向 `supplemental_materials` | ✅ 确认 |
| 资料卡三版本的认证展示规则与导入冻结 v1 一致 | ✅ 确认 |
| `certification_items.type` 枚举值覆盖所有认证类型 | ✅ 确认（identity / education / income / assets / marital_history / health / other） |
| 扩展字段不破坏已冻结最小结构 | ✅ 确认（4 个新增字段均为 nullable 或空数组） |

---

## 十、冻结评审结论 v1

### 10.1 本轮已冻结完成

- 五级认证类型字典（L1-L5 + other 预留）
- 每种认证类型的材料要求、验证要点、关联字段 keys
- 认证关联规则总约束（只校验，不自动覆盖）
- 认证状态五枚举（`not_submitted / pending_review / verified / rejected / expired`）
- 完整状态迁移矩阵（8 条迁移路径 + 约束条件）
- `certification_items` 扩展结构（新增 `submitted_at / expires_at / rejection_reason / related_field_keys`）
- 审核角色与权限（红娘上传 / 管理员审核 / 系统自动检测）
- 审核流程与时效建议
- 第一阶段审核最小集合与明确不做清单
- 各界面展示规则与标签优先级
- 筛选面板三项认证筛选逻辑
- 匹配联动边界（第一阶段不做认证加权匹配分）
- 数据安全与隐私规则（加密存储 / 权限控制 / 脱敏展示 / 保留策略）
- 与已冻结三份文档的兼容确认

### 10.2 本轮明确未展开

- 认证材料的 OCR / AI 自动识别实现
- 认证材料的存储方案（CDN / OSS 选型）
- 认证收费策略
- 多门店场景下的认证审核权限分配
- 健康认证的医疗合规细节
- 审核工作台 UI 设计
- 审核 SLA 监控

### 10.3 本轮结论

认证体系冻结已达到第一阶段可引用状态。

与字段冻结、主数据模型冻结、状态模型冻结、导入与资料卡冻结并列，共同构成进入实现准备阶段的基础文档。

后续应进入：

1. 从冻结文档联合推导认证相关 schema 草案
2. 设计认证审核最小 API
3. 设计认证展示组件
4. 完成一次 phase-1 认证模块评审
