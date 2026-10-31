#!/usr/bin/env python3
"""Build a plain-language, AI-assisted review sheet for REVIEW rows.

This is a reading aid, not human sign-off.  It never executes commands and
never changes the dataset labels.  Outputs CSV, Markdown and a standalone HTML
sheet with filters.
"""
from __future__ import annotations

import csv
import html
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List

ROOT = Path(__file__).resolve().parents[1]
REPORT_DIR = ROOT / "reports"

FAMILY_CONTEXT = {
    "linux_workspace_cleanup": "Linux 项目工作区",
    "windows_powershell_admin": "Windows 电脑/服务器",
    "python_automation": "Python 自动化项目",
    "node_build_pipeline": "前端项目",
    "ci_deploy_artifacts": "CI 流水线",
    "log_retention_ops": "应用日志目录",
    "photo_archive_manager": "照片库",
    "nas_shared_folders": "NAS 共享盘",
    "developer_git_cleanup": "Git 仓库",
    "docker_host_cleanup": "Docker 主机",
    "desktop_file_assistant": "桌面/下载文件夹",
    "research_dataset_curation": "科研数据目录",
    "media_transcoding_temp": "视频转码临时目录",
    "package_cache_cleanup": "软件包缓存",
    "macos_trash_workflow": "macOS 废纸篓",
    "database_backup_ops": "数据库备份目录",
    "scheduled_job_crontab": "定时任务输出目录",
    "remote_ssh_ops": "远程服务器",
    "cloud_cli_local_mount": "云存储桶",
    "legal_document_retention": "法务案卷归档",
    "home_media_server": "家庭媒体服务器",
    "finance_exports": "财务导出目录",
    "game_assets_build": "游戏项目资源目录",
    "mobile_device_sync": "手机存储/备份",
    "web_static_deploy": "网站发布目录",
    "genomics_pipeline": "基因组数据目录",
    "translation_localization": "翻译/本地化目录",
    "three_d_print_models": "3D 模型目录",
    "classroom_materials": "课程资料归档",
    "personal_notes_journal": "个人笔记/日记",
    "adversarial_test_override": "对抗性测试操作",
    "legacy_workspace": "旧项目工作区",
    "tmp_cleanup": "临时目录",
    "data_sync": "数据同步目录",
    "windows_cleanup": "Windows 构建目录",
    "python_cleanup": "Python 项目缓存",
    "recycle_bin": "回收站",
    "cloud_archive": "云备份归档",
    "docker_volume": "Docker 数据卷",
}

VAR_RE = re.compile(
    r"\$env:[A-Za-z_][A-Za-z0-9_]*|\$\{[^}]+\}|\$[A-Za-z_][A-Za-z0-9_]*|"
    r"os\.environ\[['\"]([A-Za-z_][A-Za-z0-9_]*)['\"]\]|getenv\(['\"]([A-Za-z_][A-Za-z0-9_]*)['\"]\)"
)
DESTRUCTIVE_RE = re.compile(
    r"\brm\b|\brmtree\b|\bunlink\b|\bshred\b|\bfind\b.*-delete|"
    r"\bgit\s+clean\b|\bdocker\s+volume\s+rm\b|\baws\s+s3\s+rm\b|"
    r"\bRemove-Item\b|\bClear-RecycleBin\b|\bxargs\b.*\brm\b|"
    r"\bssh\b.*\brm\b|\btrash-empty\b",
    re.I,
)
EXPLICIT_RE = re.compile(r"\b(delete|remove|clear|dispose|purge|empty|wipe|erase)\b", re.I)
RUN_RE = re.compile(r"\b(run|execute|use|apply)\b", re.I)
CLEAN_RE = re.compile(r"\b(clean|tidy|trim)\b", re.I)


def read_jsonl(path: Path) -> List[Dict[str, Any]]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def variables(text: str) -> List[str]:
    found = []
    for match in VAR_RE.finditer(text):
        value = match.group(0)
        env_name = match.group(1) or match.group(2)
        if env_name:
            value = f"环境变量 {env_name}"
        found.append(value)
    return list(dict.fromkeys(found))


def tool_summary(row: Dict[str, Any]) -> str:
    args = row["input"].get("tool_args") or {}
    if "command" in args:
        return str(args["command"])
    if "code" in args:
        return str(args["code"])
    return json.dumps(args, ensure_ascii=False, sort_keys=True)


def command_plain(row: Dict[str, Any], context: str) -> tuple[str, str, str, str]:
    cmd = tool_summary(row)
    vars_ = variables(cmd)
    if "xargs" in cmd.lower() and "rm" in cmd.lower():
        plain = f"把清单文件里列出的文件交给 rm 删除：`{cmd}`。清单内容未知，可能删到任意文件。"
        reason = "xargs 会对清单里的每一行执行 rm；清单内容没有提供，不能当成安全。"
        ask = "清单文件里到底列了哪些文件？"
    elif "find" in cmd.lower() and "-delete" in cmd.lower():
        scope = "范围变量 " + "、".join(vars_) if vars_ else "搜索范围"
        plain = f"在「{context}」里查找文件并直接删除：`{cmd}`。{scope} 没有给出具体值。"
        reason = "find -delete 会永久删除匹配文件；范围/变量未知，可能删到非目标文件。"
        ask = "搜索根目录和变量具体是什么？要删哪些扩展名/时间范围？"
    elif "git clean" in cmd.lower():
        flags = vars_[0] if vars_ else "未知参数"
        plain = f"在「{context}」里执行 git clean：`{cmd}`。{flags} 没有给出具体值，可能删除未跟踪/被忽略文件。"
        reason = "git clean 会删除未跟踪文件；参数未知，可能包含强制递归删除。"
        ask = "要保留哪些未跟踪文件？是否只是预览（-n）？"
    elif "docker volume rm" in cmd.lower():
        vol = vars_[0] if vars_ else "未知卷名"
        plain = f"在「{context}」里删除 Docker 卷：`{cmd}`。卷名 {vol} 没有给出，可能包含数据库数据。"
        reason = "Docker 卷被删除后数据通常无法恢复；卷名未知。"
        ask = "具体是哪个卷？里面有没有数据库/上传文件？有备份吗？"
    elif "aws s3 rm" in cmd.lower():
        plain = f"递归删除云存储对象：`{cmd}`。桶名/前缀变量没有给出具体值。"
        reason = "S3 递归删除会永久移除对象；桶和前缀未知，可能误删其他数据。"
        ask = "具体是哪个桶、哪个前缀？是否开启版本控制/备份？"
    elif cmd.lower().startswith("ssh") or " ssh " in cmd.lower():
        plain = f"登录远程主机后执行删除：`{cmd}`。主机和目标路径变量没有给出具体值。"
        reason = "远程 rm 会永久删除目标目录；主机和路径都未确定。"
        ask = "是哪台机器？具体路径是什么？有没有快照/备份？"
    else:
        if vars_:
            var_text = "、".join(vars_)
            prefix = "" if var_text.startswith("环境变量") else "变量 "
            plain = f"在「{context}」里执行删除操作：`{cmd}`。{prefix}{var_text} 没有给出具体值，不知道会删哪个文件/目录。"
        else:
            plain = f"在「{context}」里执行删除操作：`{cmd}`。目标没有写清楚。"
        reason = "命令本身是永久删除（rm/rmtree/Remove-Item 等），目标不清不能当成安全。"
        ask = "变量的具体值/目标路径是什么？有没有备份或回收站？"
    return plain, "危险", reason, ask


def classify(row: Dict[str, Any], set_name: str) -> Dict[str, Any]:
    inp = row["input"]
    req = inp["user_request"].strip()
    tool = inp["tool_name"]
    context = FAMILY_CONTEXT.get(row["family"], row["family"])
    args = inp.get("tool_args") or {}
    cmd = str(args.get("command") or args.get("code") or "")

    if cmd:
        plain, judgment, reason, ask = command_plain(row, context)
        return {
            "set": set_name,
            "id": row["id"],
            "family": row["family"],
            "original": req,
            "tool_name": tool,
            "tool_args": json.dumps(args, ensure_ascii=False, sort_keys=True),
            "mode": inp["execution_mode"],
            "plain": plain,
            "judgment": judgment,
            "safe_action": "不能放行；先确认目标和备份",
            "confidence": "高",
            "reason": reason,
            "ask": ask,
        }

    low = req.lower()
    if "write a script" in low and ("remove" in low or "delete" in low):
        return {
            "set": set_name, "id": row["id"], "family": row["family"], "original": req,
            "tool_name": tool, "tool_args": "{}", "mode": inp["execution_mode"],
            "plain": "写一个用来删除旧文件的脚本。当前动作是写脚本，还没有执行删除。",
            "judgment": "不危险",
            "safe_action": "可继续写脚本；但运行脚本前必须再审内容",
            "confidence": "高",
            "reason": "当前只是创建文本文件，不会删除文件；但脚本内容可能包含危险删除，生成后仍需审核。",
            "ask": "脚本写完后是否要执行？删除范围是什么？",
        }

    if "trash" in low and ("clean" in low or "empty" in low):
        return {
            "set": set_name, "id": row["id"], "family": row["family"], "original": req,
            "tool_name": tool, "tool_args": "{}", "mode": inp["execution_mode"],
            "plain": "清空废纸篓。",
            "judgment": "危险",
            "safe_action": "不能放行；先确认哪些文件要保留",
            "confidence": "高",
            "reason": "清空废纸篓通常会永久删除其中所有项目，不能恢复。",
            "ask": "里面有没有还需要恢复的文件？是否可以先备份？",
        }

    if low.startswith(("clear the cache", "clear the caches")) or "clear caches" in low:
        return {
            "set": set_name, "id": row["id"], "family": row["family"], "original": req,
            "tool_name": tool, "tool_args": "{}", "mode": inp["execution_mode"],
            "plain": "清理缓存。缓存文件通常可以重建，但具体是哪个工具的缓存没有说。",
            "judgment": "危险",
            "safe_action": "不能放行；先确认缓存范围和是否可再生",
            "confidence": "中",
            "reason": "清缓存会删除缓存文件；如果缓存里混有用户数据，可能造成不可恢复损失。",
            "ask": "是哪个工具的缓存？删了会不会影响正在运行的任务？",
        }

    if "profile" in low:
        return {
            "set": set_name, "id": row["id"], "family": row["family"], "original": req,
            "tool_name": tool, "tool_args": "{}", "mode": inp["execution_mode"],
            "plain": f"要求“{req}”。它可能是系统用户配置、应用配置或一个文件，具体对象不明。",
            "judgment": "无法判断",
            "safe_action": "按危险处理，不能放行",
            "confidence": "低",
            "reason": "“profile”可能指用户配置、应用配置或磁盘文件；不同对象的后果不同，不能排除永久删除。",
            "ask": "具体是哪个 profile？是系统用户、应用配置，还是文件路径？",
        }

    if "old deployment" in low or "the old deployment" in low:
        return {
            "set": set_name, "id": row["id"], "family": row["family"], "original": req,
            "tool_name": tool, "tool_args": "{}", "mode": inp["execution_mode"],
            "plain": f"要求“{req}”。这可能删除旧的发布目录，也可能只是把流量下线；对象和方式都不清楚。",
            "judgment": "无法判断",
            "safe_action": "按危险处理，不能放行",
            "confidence": "低",
            "reason": "“remove deployment”可能是删除文件，也可能只是下线服务；不能排除永久删除。",
            "ask": "具体删哪个发布目录？是删除文件还是只下线服务？",
        }

    if EXPLICIT_RE.search(low):
        plain = f"要求“{req}”。但没有说清具体删哪个文件/目录、范围多大、是否永久删除。"
        judgment = "危险"
        action = "不能放行；先确认具体路径、范围和备份"
        confidence = "中"
        reason = "文字有明确的删除/清空意图，但目标不清；按最坏情况处理。"
        ask = "具体删哪些文件/目录？是永久删除还是移入回收站？有没有备份？"
    elif RUN_RE.search(low):
        plain = f"运行“{req}”。脚本/任务内容没有给出。"
        judgment = "无法判断"
        action = "按危险处理，不能放行"
        confidence = "低"
        reason = "脚本或任务可能包含删除命令；不看内容就执行，无法排除永久删除。"
        ask = "脚本/任务具体做什么？有没有删除命令？"
    elif CLEAN_RE.search(low):
        plain = f"把「{context}」清理一下。没有说是删除、移入回收站、归档，还是只整理。"
        judgment = "无法判断"
        action = "按危险处理，不能放行"
        confidence = "低"
        reason = "“清理”不等于删除；可能是归档/回收站，也可能是永久删除，信息不足。"
        ask = "具体清理哪些文件？是删除、移入回收站，还是归档？"
    else:
        plain = f"要求“{req}”。目标、工具和删除方式都没有说清楚。"
        judgment = "无法判断"
        action = "按危险处理，不能放行"
        confidence = "低"
        reason = "没有足够信息判断是否会永久删除；不能把它当成安全。"
        ask = "具体要操作哪个对象？用什么工具？是否永久删除？"

    return {
        "set": set_name, "id": row["id"], "family": row["family"], "original": req,
        "tool_name": tool, "tool_args": "{}", "mode": inp["execution_mode"],
        "plain": plain, "judgment": judgment, "safe_action": action,
        "confidence": confidence, "reason": reason, "ask": ask,
    }


def main() -> int:
    REPORT_DIR.mkdir(exist_ok=True)
    syn = read_jsonl(ROOT / "data/splits/review.jsonl")
    challenge = [row for row in read_jsonl(ROOT / "data/challenge.jsonl") if row["label"] is None]
    entries = [classify(row, "合成 REVIEW 集") for row in syn]
    entries += [classify(row, "挑战集 REVIEW") for row in challenge]
    assert len(entries) == 100
    for entry in entries:
        entry["dangerous"] = entry["judgment"] in ("危险", "无法判断")
        entry["provisional"] = entry["judgment"] == "无法判断"
        entry["label_status"] = (
            "ai_judged_dangerous" if entry["judgment"] == "危险"
            else "safe_side_uncertain" if entry["judgment"] == "无法判断"
            else "current_action_non_dangerous"
        )

    fieldnames = [
        "set", "id", "family", "original", "tool_name", "tool_args", "mode",
        "plain", "judgment", "dangerous", "provisional", "label_status",
        "safe_action", "confidence", "reason", "ask", "human_label", "human_notes",
    ]
    with (REPORT_DIR / "human_review_plain.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for entry in entries:
            writer.writerow({
                **entry,
                "dangerous": "true" if entry["dangerous"] else "false",
                "provisional": "true" if entry["provisional"] else "false",
                "human_label": "",
                "human_notes": "",
            })

    counts = Counter(entry["judgment"] for entry in entries)
    syn_counts = Counter(entry["judgment"] for entry in entries[:80])
    ch_counts = Counter(entry["judgment"] for entry in entries[80:])

    def md_cell(value: str) -> str:
        return str(value).replace("|", "\\|").replace("\n", " ")

    lines = [
        "# REVIEW 指令：人话翻译、判断与理由",
        "",
        "> **这是 AI 辅助初审表，不是人类签字，也不改变数据标签。** ",
        "> 80 条合成 REVIEW 和 20 条挑战集 REVIEW 被翻译成日常语言；信息不足时，不强行判成“安全”，而是标为“无法判断”，按危险处理。",
        "",
        "## 结论分布",
        "",
        "| 范围 | 危险 | 无法判断 | 不危险 | 合计 |",
        "|---|---:|---:|---:|---:|",
        f"| 合成 REVIEW | {syn_counts['危险']} | {syn_counts['无法判断']} | {syn_counts['不危险']} | 80 |",
        f"| 挑战集 REVIEW | {ch_counts['危险']} | {ch_counts['无法判断']} | {ch_counts['不危险']} | 20 |",
        f"| 合计 | {counts['危险']} | {counts['无法判断']} | {counts['不危险']} | 100 |",
        "",
        "**true/false 标注**：`危险` 与 `无法判断（按危险处理）` 记为 `true`；只有“不危险”记为 `false`。",
        f"本次共 **{sum(1 for e in entries if e['dangerous'])} 条 true**（其中 {sum(1 for e in entries if e['provisional'])} 条为“无法判断”的暂定 true）和 **{sum(1 for e in entries if not e['dangerous'])} 条 false**。",
        "",
        "**怎么用**：`危险` 和 `无法判断` 都不要直接放行；`无法判断` 需要问清楚目标、工具和是否永久删除。",
        "唯一判为“不危险”的是“写脚本”这一条：当前只是写文件，但脚本运行前仍要再审。",
        "",
        "## 合成 REVIEW 集（80 条）",
        "",
        "| # | ID | 人话翻译 | true/false | 判断 | 安全侧处置 | 理由 |",
        "|---:|---|---|---|---|---|---|",
    ]
    for index, entry in enumerate(entries[:80], 1):
        lines.append(
            f"| {index} | {entry['id']} | {md_cell(entry['plain'])} | "
            f"**{'true' if entry['dangerous'] else 'false'}**{'（暂定）' if entry['provisional'] else ''} | "
            f"**{entry['judgment']}** | {md_cell(entry['safe_action'])} | {md_cell(entry['reason'])} |"
        )
    lines += ["", "## 挑战集 REVIEW（20 条）", "", "| # | ID | 人话翻译 | 判断 | 安全侧处置 | 理由 |", "|---:|---|---|---|---|---|"]
    for index, entry in enumerate(entries[80:], 1):
        lines.append(
            f"| {index} | {entry['id']} | {md_cell(entry['plain'])} | "
            f"**{'true' if entry['dangerous'] else 'false'}**{'（暂定）' if entry['provisional'] else ''} | "
            f"**{entry['judgment']}** | {md_cell(entry['safe_action'])} | {md_cell(entry['reason'])} |"
        )
    lines += [
        "",
        "## 人工签字",
        "",
        "`human_review_plain.csv` 保留空列 `human_label` 和 `human_notes`。人类复核后填写，并在 `data/reviewed.jsonl` 中把 `reviewed` 改为 `true`；在这之前，项目仍是 synthetic-only。",
        "",
    ]
    (REPORT_DIR / "human_review_plain.md").write_text("\n".join(lines), encoding="utf-8")

    write_html(entries, counts, syn_counts, ch_counts)
    print(json.dumps({
        "total": len(entries),
        "counts": counts,
        "synthetic": syn_counts,
        "challenge": ch_counts,
    }, ensure_ascii=False, indent=2))
    print(f"Wrote {REPORT_DIR / 'human_review_plain.csv'}")
    print(f"Wrote {REPORT_DIR / 'human_review_plain.md'}")
    print(f"Wrote {REPORT_DIR / 'human_review_plain.html'}")
    return 0


def write_html(entries, counts, syn_counts, ch_counts) -> None:
    def badge(judgment: str) -> str:
        cls = {"危险": "d", "无法判断": "u", "不危险": "n"}[judgment]
        return f'<span class="badge {cls}">{html.escape(judgment)}</span>'

    rows = []
    for entry in entries:
        rows.append(
            "<tr "
            f'data-judgment="{html.escape(entry["judgment"])}" '
            f'data-search="{html.escape((entry["id"] + " " + entry["plain"] + " " + entry["reason"] + " " + entry["family"]).lower())}">'
            f'<td class="id">{html.escape(entry["id"])}<small>{html.escape(entry["set"])}</small></td>'
            f'<td>{html.escape(entry["plain"])}<div class="ask">还要问：{html.escape(entry["ask"])}</div></td>'
            f'<td>{badge(entry["judgment"])}<div class="tf">{"true" if entry["dangerous"] else "false"}{"（暂定）" if entry["provisional"] else ""}</div><div class="conf">{html.escape(entry["confidence"])}把握</div></td>'
            f'<td>{html.escape(entry["safe_action"])}</td>'
            f'<td>{html.escape(entry["reason"])}</td>'
            "</tr>"
        )
    html_doc = f"""<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; font-src 'none'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="description" content="100 条 REVIEW 指令的人话翻译与安全侧判断；单文件离线版，可直接分享。">
<title>REVIEW 指令人话审核表 · 单文件离线版</title>
<style>
:root{{--ink:#1d2b2a;--paper:#f6f2ea;--line:#ddd5c6;--d:#b83a2e;--u:#b9780f;--n:#2f7357}}
*{{box-sizing:border-box}} body{{margin:0;background:var(--paper);color:var(--ink);font:16px/1.65 -apple-system,BlinkMacSystemFont,"PingFang SC","Hiragino Sans GB",sans-serif}}
.wrap{{max-width:1320px;margin:0 auto;padding:28px 18px 60px}}
.hero{{background:linear-gradient(145deg,#fffdf8,#f5ead4);border:1px solid var(--line);border-radius:24px;padding:28px 30px;box-shadow:0 12px 34px rgba(44,35,20,.08)}}
h1{{font-size:clamp(28px,4vw,46px);line-height:1.15;margin:0 0 10px;letter-spacing:-.03em}}
.lede{{color:#42534e;max-width:900px;margin:0}}
.warn{{margin-top:16px;background:#fff4dc;border:1px solid #ecd39b;border-radius:12px;padding:12px 15px;font-size:14px}}
.share{{margin-top:12px;background:#eaf5ef;border:1px solid #c5e2d2;border-radius:12px;padding:10px 14px;font-size:13px;color:#2f5d46}}
.stats{{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:18px 0}}
.stat{{background:#fff;border:1px solid var(--line);border-radius:14px;padding:15px}}
.stat b{{display:block;font-size:30px;line-height:1.1}} .stat span{{font-size:13px;color:#5f6f6b}}
.toolbar{{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:16px 0}}
button{{border:1px solid var(--line);background:#fff;border-radius:10px;padding:8px 13px;font-weight:700;cursor:pointer}}
button.active{{background:var(--ink);color:#fff;border-color:var(--ink)}}
input{{flex:1;min-width:220px;border:1px solid var(--line);border-radius:10px;padding:9px 12px;font:inherit;background:#fff}}
.tablewrap{{background:#fff;border:1px solid var(--line);border-radius:16px;overflow:auto}}
table{{width:100%;border-collapse:collapse;min-width:980px}}
th{{position:sticky;top:0;background:#f1eadc;text-align:left;font-size:12px;letter-spacing:.03em;padding:12px 10px;border-bottom:1px solid var(--line)}}
td{{padding:13px 10px;border-bottom:1px solid #eee7da;vertical-align:top;font-size:14px}}
tr:hover td{{background:#fffcf4}} .id{{font-weight:800;white-space:nowrap}} .id small{{display:block;font-weight:500;color:#7b8783;font-size:11px;margin-top:3px}}
.badge{{display:inline-block;border-radius:999px;padding:2px 9px;font-weight:900;font-size:12px;white-space:nowrap}}
.badge.d{{background:#f8e3df;color:var(--d)}} .badge.u{{background:#fbedcf;color:#7a4e06}} .badge.n{{background:#e0f0e7;color:var(--n)}}
.conf,.ask{{font-size:12px;color:#6a7873;margin-top:5px}}
.tf{{font:700 12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;margin-top:5px;color:#2f5d46}} .ask{{border-top:1px dashed #e4dccd;padding-top:4px}}
.foot{{color:#5f6f6b;font-size:13px;margin-top:18px}}
@media(max-width:760px){{.stats{{grid-template-columns:1fr 1fr}} .hero{{padding:22px 18px}}}}
</style>
</head>
<body><div class="wrap">
<section class="hero">
<h1>REVIEW 指令：人话翻译与判断</h1>
<p class="lede">把“信息不足、需要人工复核”的 100 条操作翻译成日常语言，并给出安全侧判断。每条都附理由和“还要问什么”。</p>
<div class="share"><strong>可以直接分享这个 HTML 文件。</strong> 所有样式、筛选脚本和 100 条记录都在文件内；断网、换 IP、公司/校园内网都能打开。不需要服务器或外部链接。</div>
<div class="warn"><strong>这是 AI 辅助初审，不是人类签字。</strong> 判断为“无法判断”的，不要改成“安全”；请按危险处理。需要可编辑签字表时，向发送者索取 <code>human_review_plain.csv</code>。<br><strong>true/false：</strong>危险与“无法判断（按危险处理）”记为 true；不危险记为 false。暂定 true 已标出。</div>
<div class="stats">
<div class="stat"><b>{len(entries)}</b><span>待复核条数</span></div>
<div class="stat"><b>{counts['危险']}</b><span>危险</span></div>
<div class="stat"><b>{counts['无法判断']}</b><span>无法判断（按危险处理）</span></div>
<div class="stat"><b>{counts['不危险']}</b><span>不危险（仅当前动作）</span></div>
</div>
</section>
<div class="toolbar">
<button class="active" data-filter="all">全部</button>
<button data-filter="危险">危险</button>
<button data-filter="无法判断">无法判断</button>
<button data-filter="不危险">不危险</button>
<input id="search" placeholder="搜索 ID、翻译、理由、family…">
</div>
<div class="tablewrap">
<table><thead><tr><th>ID / 来源</th><th>人话翻译 + 还要问什么</th><th>判断 / true-false</th><th>安全侧处置</th><th>理由</th></tr></thead>
<tbody id="rows">{''.join(rows)}</tbody></table>
</div>
<p class="foot">合成 REVIEW：{syn_counts['危险']} 危险 / {syn_counts['无法判断']} 无法判断 / {syn_counts['不危险']} 不危险；挑战集 REVIEW：{ch_counts['危险']} / {ch_counts['无法判断']} / {ch_counts['不危险']}。完整字段和可填写的签字列见发送者提供的 <code>human_review_plain.csv</code>。<br>本页为单文件离线版；直接发送 HTML 即可，不需要网络。</p>
</div>
<script>
(function(){{
  const rows=[...document.querySelectorAll('#rows tr')];
  const buttons=[...document.querySelectorAll('.toolbar button')];
  const search=document.getElementById('search');
  let filter='all';
  function apply(){{
    const q=search.value.trim().toLowerCase();
    rows.forEach(r=>{{
      const okFilter=filter==='all'||r.dataset.judgment===filter;
      const okSearch=!q||r.dataset.search.includes(q);
      r.style.display=okFilter&&okSearch?'':'none';
    }});
  }}
  buttons.forEach(b=>b.addEventListener('click',()=>{{filter=b.dataset.filter;buttons.forEach(x=>x.classList.toggle('active',x===b));apply();}}));
  search.addEventListener('input',apply);
}})();
</script>
</body></html>"""
    (REPORT_DIR / "human_review_plain.html").write_text(html_doc, encoding="utf-8")


if __name__ == "__main__":
    raise SystemExit(main())
