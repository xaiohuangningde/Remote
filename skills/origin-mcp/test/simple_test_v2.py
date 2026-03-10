"""
origin-mcp 简化测试 - 单例模式
"""

import asyncio
import sys
from pathlib import Path

# 添加技能路径
skill_path = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(skill_path))

from __init__ import OriginService


async def run_all_tests():
    """运行所有测试"""
    print("=" * 60)
    print("origin-mcp 简化测试")
    print("=" * 60)
    
    service = OriginService()
    
    try:
        # 1. 启动
        print("\n[测试 1] 启动 Origin...")
        await service.start()
        print("[OK] Origin 启动成功")
        
        # 2. 创建项目
        print("\n[测试 2] 创建新项目...")
        result = await service.new_project()
        print(f"[OK] 项目创建成功：{result['book']}")
        
        # 3. 创建工作表
        print("\n[测试 3] 创建工作表...")
        result = await service.create_sheet("TestData")
        print(f"[OK] 工作表创建成功：{result['sheet']}")
        
        # 4. 设置数据
        print("\n[测试 4] 设置数据...")
        await service.set_data(0, [1, 2, 3, 4, 5], axis='X', lname="Time")
        await service.set_data(1, [2, 4, 6, 8, 10], axis='Y', lname="Value")
        print("[OK] 数据设置成功")
        
        # 5. 创建折线图
        print("\n[测试 5] 创建折线图...")
        result = await service.create_plot({
            "x": [1, 2, 3, 4, 5],
            "y": [1.5, 3.2, 4.8, 6.1, 7.9],
            "type": "line",
            "title": "My Plot",
            "xlabel": "Time (s)",
            "ylabel": "Value"
        })
        print(f"[OK] 折线图创建成功：{result['graph']}")
        
        # 6. 导出
        print("\n[测试 6] 导出图表...")
        result = await service.save_graph("test_simple.png")
        print(f"[OK] 图表导出成功：{result['path']}")
        
        # 7. 保存项目
        print("\n[测试 7] 保存项目...")
        result = await service.save_project("test_simple.opju")
        print(f"[OK] 项目保存成功：{result['path']}")
        
        # 8. 检查版本
        print("\n[测试 8] 检查 Origin 版本...")
        result = await service.get_version()
        print(f"[OK] Origin 版本：{result['version']}")
        
        print("\n" + "=" * 60)
        print("所有测试通过！")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n[ERROR] 测试失败：{e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # 退出
        try:
            await service.stop()
            print("\nOrigin 已退出")
        except:
            pass


if __name__ == "__main__":
    asyncio.run(run_all_tests())
