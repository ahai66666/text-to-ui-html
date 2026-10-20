# 维护检查环境

页面生成与路由脚本使用 Node.js。skill-creator 的 quick_validate.py 是另一个 Python 格式检查器，需要 PyYAML；它在 import yaml 时失败表示检查器未启动，不表示 HTML 生成失败。

## 首次准备

在技能仓库根目录执行，创建隔离环境，不修改系统 Python：

```sh
python3 -m venv outputs/skill-validation-venv
outputs/skill-validation-venv/bin/python -m pip install -r maintenance/requirements-validation.txt
sh maintenance/check-skill.sh
```

默认检查器位置为 `$CODEX_HOME/skills/.system/skill-creator/scripts/quick_validate.py`，未设置 CODEX_HOME 时使用 `~/.codex`。其他环境通过 SKILL_FORMAT_VALIDATOR 指定现有检查器；没有安装 skill-creator 时，先获得该检查器，不能将未运行报告为通过。

复用已有隔离环境：

```sh
SKILL_VALIDATION_PYTHON="/absolute/path/to/venv/bin/python" sh maintenance/check-skill.sh
```

此命令只检查技能格式、资源/目录/导航索引、共享数据快照与分发摘要，不修改生成文件。源码发生变化后，先按 SKILL.md 重建索引和摘要。需要确认生成能力时另跑 `node --test tests/*.test.mjs`；测试使用临时项目。构建、浏览器、视觉和其他模型验收分别记录。

requirements、检查脚本与本文都位于 maintenance，不进入技能运行包。普通用户生成页面无需安装这套 Python 检查依赖。
