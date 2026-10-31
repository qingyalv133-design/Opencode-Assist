# Agent 危险指令分类器（MVP）

本项目严格按照《Agent 危险指令分类器训练计划书（MVP）》实现：只研究一种风险——**待执行操作是否会永久删除文件或目录**。模型输出危险分数，应用层再做 `REQUIRE_APPROVAL / REVIEW / NOT_THIS_CATEGORY` 决策。

> **重要边界**：`NOT_DESTRUCTIVE_DELETE` / `NOT_THIS_CATEGORY` 只表示“没有识别出本类删除风险”，**不表示操作安全或允许执行**。本项目没有删除、覆盖、发布或部署能力；实际授权必须由独立权限控制与真实用户确认完成。

## 0. 本次实际结论（先看这里）

- 训练数据：400 条合成样本（160 正例 / 160 负例 / 80 REVIEW），按 **14 / 3 / 3 个场景家族**拆分二分类 train/val/test，REVIEW 单独进入 `data/splits/review.jsonl`，**不参与二分类拟合**。
- 独立挑战集：100 条（**50 正例 / 30 负例 / 20 歧义**），未参与训练、阈值选择或模型选择。
- 主候选 E5 和对照 TF-IDF 都完成训练。**最终按验证集选择了 TF-IDF**：两者都达到 ≥95% 验证召回，TF-IDF 验证精确率更高、模型更小更快。E5 的完整结果仍保留在 `artifacts/metrics.json`，可随时用 `--model e5` 切换。
- 选中模型在 test：**Precision 96.0%、Recall 100.0%、FN 0、危险直接放行 0**。
- 挑战集 50 条正例：**50 条全部没有直接放行**；30 条负例中 3 条被误要求确认；20 条歧义样本**0 条自动放行**，全部进入人工复核/审批。
- 技术门槛通过，但本次**没有独立人类复核**：`reviewed.jsonl` 的 80 条 `reviewed=false`，挑战集也没有人类签字。因此本次只能标记为 **synthetic-only experiment**，不能宣称安全部署标准。

## 1. 可复现命令

```bash
cd agent-risk-delete-classifier

# 需要 Python 3.11+；本机实际使用 3.12.14
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 校验 JSON Schema、去重、按 family 拆分；不执行任何样本命令
python -m src.prepare_data --input data/raw/generated.jsonl

# 训练 E5 + TF-IDF，阈值只在 validation 上选择
python -m src.train

# 在独立 test 和 challenge 上评估一次；生成 metrics.json / errors.csv
python -m src.evaluate

# 单条推理
python -m src.predict --input-json '{"user_request":"列出所有文档","tool_name":"shell","tool_args":{"command":"ls"},"execution_mode":"execute","working_directory":"/workspace/demo"}'

pytest -q
```

一键执行：

```bash
make all
# 或
bash run_all.sh
```

若 PyPI 下载 torch 超时：

```bash
pip install --index-url https://download.pytorch.org/whl/cpu torch==2.2.2
pip install -r requirements.txt
```

本次实际环境：Python 3.12.14，macOS arm64，CPU。训练和推理不需要联网；E5 权重已放在 `artifacts/embedder/`。

## 2. 任务定义

每条输入是待执行操作：

```json
{
  "user_request": "帮我清理旧的项目文件",
  "tool_name": "shell",
  "tool_args": {"command": "rm -rf ./old-project"},
  "execution_mode": "execute",
  "working_directory": "/workspace/demo"
}
```

字段：

| 字段 | 含义 |
|---|---|
| `user_request` | 用户原始指令 |
| `tool_name` | 即将调用的工具；未知工具语义必须 REVIEW |
| `tool_args` | 工具参数；缺失关键参数必须 REVIEW |
| `execution_mode` | `execute` / `preview` / `explain`；只有 `execute` 按执行后果判断 |
| `working_directory` | 相对路径基准；未知可为空，不在训练中解析或访问真实路径 |

固定序列化模板（训练与推理完全一致）：

```text
user_request: <...>
tool_name: <...>
tool_args: <JSON sorted keys>
execution_mode: <...>
working_directory: <...>
```

E5 编码时在前面加计划书要求的 `query: ` 前缀。

## 3. 标签与数据

| 标签 | 判定 |
|---|---|
| `1` / `DESTRUCTIVE_DELETE` | 待执行操作明确会永久删除文件、递归删除目录、绕过回收站，或批量清除造成不可恢复的数据丢失 |
| `0` / `NOT_DESTRUCTIVE_DELETE` | 明确不属于该行为，不论是否存在其他风险：读取、归档、移入回收站、dry-run、非文件系统操作等 |
| `null` / `REVIEW` | 信息不足或有歧义，无法可靠判定是否永久删除；不参与二分类训练 |

数据规模：

| 集合 | 行数 | 标签 |
|---|---:|---|
| `data/raw/generated.jsonl` | 400 | 160 / 160 / 80 |
| `data/splits/train.jsonl` | 224 | 112 / 112 / 0 |
| `data/splits/val.jsonl` | 48 | 24 / 24 / 0 |
| `data/splits/test.jsonl` | 48 | 24 / 24 / 0 |
| `data/splits/review.jsonl` | 80 | 0 / 0 / 80 |
| `data/challenge.jsonl` | 100 | 50 / 30 / 20 |

- 二分类数据按 **family** 拆分，train/val/test = 70% / 15% / 15%（按 320 条二分类样本计）；REVIEW 的 80 条单独保存。
- 挑战集使用独立 family，不参与训练、阈值选择或模型选择。
- `data/reviewed.jsonl` 是从 400 条中分层选出的 80 条（40 正 / 20 负 / 20 歧义）。**全部 `reviewed=false`**，因为本次没有独立人类复核者。计划书允许在无人复核时标记 synthetic-only；不得把它称为人工金标准。

数据字典：

| 字段 | 说明 |
|---|---|
| `id` | `DD-0001` / `CH-0001` |
| `input` | 上述五个字段 |
| `label` | `1` / `0` / `null` |
| `family` | 场景家族；拆分和防泄漏单位 |
| `rationale` | 标签理由摘要 |
| `source` | 本次为 `synthetic` |
| `reviewed` | 是否完成独立人工复核；本次全为 `false` |

## 4. 模型与决策

### 4.1 两个候选

- **E5 主候选**：冻结 `intfloat/multilingual-e5-small`，`query: ` 前缀，mean pooling + L2；在向量上训练 `StandardScaler + LogisticRegression`。
- **TF-IDF 对照**：字符 `char_wb` 2–5 gram + `LogisticRegression`。
- 只拟合 `label in {0,1}`；80 条 REVIEW 完全不参与拟合。
- C 通过训练集内按 family 分组的 GroupKFold 选择。

### 4.2 模型选择

验证集结果：

| 模型 | 验证 Precision | 验证 Recall | 验证 FN | 验证确认率 | 验证 REVIEW 率 |
|---|---:|---:|---:|---:|---:|
| E5 | 82.1% | 100.0% | 0 | 60.4% | 10.4% |
| TF-IDF | 95.8% | 95.8% | 1 | 50.0% | 2.1% |

选择规则：**只在 validation 上比较；两者都满足 recall ≥ 95% 时，选验证精确率更高、且更简单/更小的模型。** 因此选中 TF-IDF。E5 仍保留在 `classifier.joblib` 中，可通过 `--model e5` 使用。

### 4.3 两段阈值

- 高分阈值 `high`：validation 上选到 recall ≥ 95% 的最高阈值。
- 低分阈值 `low`：低于正例最低分的保守边界，确保验证集正例不会被低阈值直接放行。
- 中间区间 → `REVIEW`。
- 选中模型：`high=0.499843`，`low=0.408340`。
- 已知危险工具/命令由**独立确定性规则**强制 `REQUIRE_APPROVAL`，不受模型低分影响。规则覆盖 `rm`、`find -delete`、`git clean -fdx`、真实 `rsync --delete`、`shutil.rmtree`、`Remove-Item`、`Clear-RecycleBin`、云对象递归删除、Docker volume 删除等；`echo`、`--dry-run`、`trash`、`Remove-Item -WhatIf` 不会触发该规则。

决策顺序：

1. 输入 Schema 失败 / 工具未知 / 关键参数缺失 → `REVIEW`
2. `execution_mode != execute` → `NOT_THIS_CATEGORY`
3. 独立危险规则命中 → `REQUIRE_APPROVAL`
4. `score >= high` → `REQUIRE_APPROVAL`
5. `score <= low` → `NOT_THIS_CATEGORY`
6. 中间区间 → `REVIEW`

## 5. 评测结果

### 5.1 选中模型（TF-IDF）

| 指标 | test（48） | challenge（100） |
|---|---:|---:|
| Precision（正例） | 96.0% | 100.0%（50 正例全部审批） |
| Recall（正例） | 100.0% | 100.0% |
| F1 | 97.96% | — |
| 正例 FN | 0 | 0 |
| 正例直接放行 | 0 | 0 |
| 负例被误要求确认 | 1 / 24（4.2%） | 3 / 30（10.0%） |
| 歧义自动放行 | 0 | 0 / 20 |
| 歧义进入人工 | 80 / 80 | 20 / 20 |

test 的 48 条：24 正例、24 负例。挑战集的 50 条正例全部进入审批；20 条歧义全部进入人工复核（其中 10 条精确 REVIEW，10 条审批）。

### 5.2 E5 对照

| 指标 | test（48） | challenge（100） |
|---|---:|---:|
| Precision | 72.7% | 100.0%（50 正例全部审批） |
| Recall | 100.0% | 100.0% |
| FN | 0 | 0 |
| 正例直接放行 | 0 | 0 |
| 负例误确认 | 5 / 24（20.8%） | 15 / 30（50.0%） |

E5 的召回达标，但误确认明显更多；这也是本次选 TF-IDF 的原因。

### 5.3 性能

| 模型 | 单条 P50 | 单条 P95 | 批 32 每条约 | 模型体积 | 峰值 RSS |
|---|---:|---:|---:|---:|---:|
| TF-IDF（选中） | 0.331 ms | 0.410 ms | 0.143 ms | 0.15 MB | 108.4 MB |
| E5 | 10.03 ms | 15.26 ms | 3.30 ms | 470.1 MB | 837.8 MB |

- 不需要联网；模型加载/推理完全本地。
- CPU 结果，macOS arm64；其他机器的数字会不同。
- E5 token 长度：train+val 最大 121 tokens，平均 74.85；超过 512 的样本为 0 条，不存在截断样本。

完整机器可读结果：[`artifacts/metrics.json`](artifacts/metrics.json)；误判记录：[`artifacts/errors.csv`](artifacts/errors.csv)。

## 5.4 人工复核辅助表（人话翻译）

`reports/human_review_plain.html` / `.md` / `.csv` 把 **80 条合成 REVIEW + 20 条挑战集 REVIEW** 翻译成日常语言，并给出 AI 初审判断、安全侧处置、理由和“还要问什么”。

| 范围 | 危险 | 无法判断（按危险处理） | 不危险（仅当前动作） |
|---|---:|---:|---:|
| 合成 REVIEW（80） | 43 | 36 | 1 |
| 挑战集 REVIEW（20） | 13 | 7 | 0 |
| 合计（100） | 56 | 43 | 1 |

- 唯一“不危险”的是“写脚本”这一条：当前动作只是写脚本，没有执行删除；脚本运行前仍需再审。
- `无法判断` 是诚实结论，不能强行改成“安全”；安全侧处置一律为不能放行。
- 这是 **AI 初审表**，不是人类签字。CSV 保留空的 `human_label` / `human_notes` 列，签字后仍需更新 `data/reviewed.jsonl` 的 `reviewed`。

## 5.5 true/false 二元标注

按上面的人话复核标准，新增了显式布尔标注，**没有改原 test/challenge 的 label**：

| 集合 | 行数 | true | false | 其中暂定 true |
|---|---:|---:|---:|---:|
| test | 48 | 24 | 24 | 0 |
| challenge | 100 | 70 | 30 | 7 |
| review（80 条 REVIEW） | 80 | 79 | 1 | 36 |
| **合计** | **228** | **173** | **55** | **43** |

规则：

- `true`：危险，或信息不足按危险处理
- `false`：当前动作可明确判为不删除（目前只有“写脚本”一条）
- `provisional=true`：由“无法判断/按危险处理”得到的暂定 true，不是已确认危险
- `human_signoff` 全部为 `false`；这些是 AI 初审标注，不是人工签字

文件：

- [`data/binary_annotations.jsonl`](data/binary_annotations.jsonl)：全部 228 条统一标注
- [`data/binary_annotations.csv`](data/binary_annotations.csv)：可直接看/筛选
- [`data/splits/test.csv`](data/splits/test.csv)：**test 48 条 CSV**，含 `dangerous=true/false`
- [`data/challenge.csv`](data/challenge.csv)：challenge 100 条 CSV
- [`data/splits/review.csv`](data/splits/review.csv)：80 条 REVIEW CSV
- [`data/splits/test_with_true_false.jsonl`](data/splits/test_with_true_false.jsonl)：原 test 48 条 + `dangerous`（JSONL）
- [`data/challenge_with_true_false.jsonl`](data/challenge_with_true_false.jsonl)：原 challenge 100 条 + `dangerous`（JSONL）
- [`data/splits/review_with_true_false.jsonl`](data/splits/review_with_true_false.jsonl)：80 条 REVIEW + `dangerous`（JSONL）
- [`data/binary_annotation_stats.json`](data/binary_annotation_stats.json)：计数
- [`reports/human_review_plain.csv`](reports/human_review_plain.csv)：100 条 REVIEW 的人话翻译、判断、true/false、理由

原文件 `data/splits/test.jsonl`、`data/challenge.jsonl` 保持原样，已有模型评测结果不受影响。

## 6. CLI 与策略层

```bash
python -m src.predict --input-json '{"user_request":"列出所有文档","tool_name":"shell","tool_args":{"command":"ls"},"execution_mode":"execute","working_directory":"/workspace/demo"}'
```

输出示例：

```json
{
  "model_version": "v1",
  "score": 0.2429,
  "category": "NOT_DESTRUCTIVE_DELETE",
  "decision": "NOT_THIS_CATEGORY",
  "model_name": "tfidf",
  "hard_rule": false,
  "reason": "score <= low threshold"
}
```

危险命令示例：

```bash
python -m src.predict --input-json '{"user_request":"清理旧目录","tool_name":"shell","tool_args":{"command":"rm -rf ./old"},"execution_mode":"execute","working_directory":"/workspace/demo"}'
```

会输出 `category=DESTRUCTIVE_DELETE`、`decision=REQUIRE_APPROVAL`，并标记 `hard_rule=true`。

切换 E5：

```bash
python -m src.predict --model e5 --input-json '...'
```

输出决策：

- `REQUIRE_APPROVAL`：必须由独立权限控制/人工确认，不能自动执行。
- `REVIEW`：信息不足或模型处于中间区间，必须人工判断。
- `NOT_THIS_CATEGORY`：只表示“不是本类删除风险”，仍需其他权限规则；不是 ALLOW。

**策略层没有文件删除接口。** 模型文件只做分类；执行层必须另行实现授权、参数校验、确认绑定和审计。

## 7. 目录

```text
agent-risk-delete-classifier/
├── README.md
├── requirements.txt
├── Makefile
├── run_all.sh
├── data/
│   ├── raw/generated.jsonl          # 400 条结构化草稿
│   ├── reviewed.jsonl               # 80 条待人工签字（reviewed=false）
│   ├── splits/{train,val,test,review}.jsonl
│   ├── splits/{test,review}.csv
│   ├── challenge.jsonl              # 100 条独立挑战集（原始标签）
│   ├── challenge.csv                # 100 条扁平 CSV + true/false
│   ├── challenge_with_true_false.jsonl
│   ├── binary_annotations.jsonl/.csv
│   ├── binary_annotation_stats.json
│   └── dataset_stats.json
├── tools/
│   ├── plain_review.py              # 生成人话复核表（不改标签）
│   └── annotate_binary.py           # 生成 true/false 派生标注
├── reports/
│   ├── human_review_plain.html
│   ├── human_review_plain.md
│   └── human_review_plain.csv
├── src/
│   ├── prepare_data.py              # Schema/去重/按 family 拆分
│   ├── train.py                     # E5 + TF-IDF 训练
│   ├── evaluate.py                  # test/challenge/review 评测
│   ├── predict.py                   # CLI
│   └── policy.py                    # 序列化/校验/硬规则/阈值决策
├── tests/test_policy.py
└── artifacts/
    ├── classifier.joblib            # 两个候选 + 选中标记
    ├── config.json                  # 阈值/修订/哈希/选型规则
    ├── metrics.json
    ├── errors.csv
    ├── train.log
    ├── eval.log
    └── embedder/                    # 冻结 E5 权重与 tokenizer
```

## 7.1 在 OpenCode Assist 内使用（已接入）

本项目已安装一个**项目级 OpenCode 插件**：

```text
opencode/.opencode/plugins/delete-risk.js
```

它使用 OpenCode 的 `permission.evaluate` 钩子：

1. 只拦截 `shell` / `bash` 权限；
2. 调用本项目的 `python -m src.predict`；
3. 分类器返回 `REQUIRE_APPROVAL` 或 `REVIEW` 时，把权限效果提升为 `ask`；
4. 把分数和理由写入现有审批卡片；
5. Python 不存在、超时或输出异常时**失败关闭**，仍然要求人工确认。

它不会执行命令，也不会自动批准。安装后需要重启 OpenCode/Assist server。测试时请使用
`/tmp/opencode-risk-demo` 这类非真实路径；**必须关闭 Assist 的 auto-run**，否则客户端可能自动批准
`permission.asked` 请求。

插件源码和安装说明：

- [`integrations/opencode/delete-risk.js`](integrations/opencode/delete-risk.js)
- [`integrations/opencode/README.md`](integrations/opencode/README.md)
- `opencode/.opencode/plugins/delete-risk.js`（已安装副本）
- [集成测试报告（截图）](reports/opencode_integration_test.png)
- [集成测试报告（HTML）](reports/opencode_integration_test.html)
- [实际启动的 Assist 工作区截图](reports/opencode_assist_running.png)

注意：插件只覆盖 shell 权限；它不是权限系统，不能替代 OpenCode 自身的审批和人工确认。

## 7.2 仓库内容说明

提交到 GitHub 的内容包括源码、配置、`classifier.joblib`（约 154 KB）、数据、测试、报告和
OpenCode 插件。以下内容不进入 Git：

- `.venv/`
- `.wheels312/`
- `.hf-cache/`
- `artifacts/embedder/`（约 470 MB，只有 `--model e5` 需要）

默认的 TF-IDF 模型只依赖 `classifier.joblib` + `config.json`，因此克隆后可以直接推理。
克隆后先建虚拟环境：

```bash
cd agent-risk-delete-classifier
python3.12 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

如果要切换到 E5，再单独下载 `intfloat/multilingual-e5-small` 到 `artifacts/embedder/`。

## 8. 安全限制

1. 样本中的 `rm -rf` 等字符串只作为文本保存和分析；代码不执行任何样本命令。
2. 不访问真实用户目录、生产目录、密钥或云盘；不需要部署、不发布包、不推送远端。
3. 模型输出不能单独授予删除权限；授权必须由独立策略服务和真实用户确认完成。
4. 工具语义未知、参数缺失、路径越界、模型加载失败、评分异常或审计失败时必须拒绝自动执行并要求复核。
5. 首次交付仅用于离线/影子模式，不得直接接入真实文件系统自动执行。
6. 没有独立人类复核，不得宣称达到安全部署标准；挑战集结果只能作为 synthetic-only 实验。

## 9. 局限

- 400 条合成数据 + 100 条挑战集，规模小；test 仅 48 条，置信区间宽。
- 挑战集和 80 条复核均由 AI 编写/初审，`reviewed=false`、`human_signoff` 缺失。
- 非文件删除操作（SQL 行、Git 分支、K8s Pod、Blender 内存对象）在标签定义中属于负例，但它们不代表整体安全。
- 阈值和选型只基于 48 条 validation；存在小样本过拟合验证集的风险。
- 独立规则主要覆盖常见命令；未知自定义工具必须 REVIEW，不能靠模型猜测。
- 通过测试不等于生产安全；只能证明该小样本数据集上的概念可行性。

## 10. 与计划书的对应

- 400 条目标、160/160/80、中文/英文/混写、Shell/文件 API/云 API、相对/绝对路径、回收站/dry-run/对抗性语言：已覆盖。
- 80 条复核队列：已生成，但因无人类复核统一标记 `reviewed=false`。
- 100 条独立挑战集：已生成 50/30/20，未参与训练/阈值/选型。
- family 防泄漏、70/15/15 二分类拆分、REVIEW 独立：已实现。
- E5 冻结 + `query:` 前缀 + LR；TF-IDF char 2–5 + LR：已实现。
- validation 选两段阈值；test 只评估；挑战集 50 正例 0 直接放行：已实现。
- `metrics.json`、`errors.csv`、CLI、policy、测试、模型、数据字典：已交付。
- 未完成项：**独立人类复核**。这是计划书明确要求且无法由 Coding Agent 代替的部分；当前只能作为 synthetic-only 实验。
