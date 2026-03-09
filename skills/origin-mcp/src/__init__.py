"""
origin-mcp - OriginPro 自动化服务

基于 originpro 包封装的 Origin 绘图服务
API 参考：https://www.originlab.com/python/doc/originpro/
官方示例：https://github.com/originlab/Python-Samples
"""

import asyncio
from pathlib import Path
from typing import Optional, Dict, Any, List, Union


class OriginService:
    """OriginPro 服务类"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.timeout = self.config.get("timeout", 60000)
        self._op = None
        self._current_book = None
        self._current_graph = None
    
    def _import(self):
        """导入 originpro 包"""
        if self._op is None:
            import originpro as op
            self._op = op
        return self._op
    
    # ========== 项目管理 ==========
    
    async def start(self) -> bool:
        """启动/连接 Origin"""
        try:
            import originpro as op
            self._op = op
            
            # 检查是否有已经运行的 Origin 实例
            try:
                # 获取所有页面，如果成功则连接到现有实例
                pages = op.pages()
                if pages:
                    self._current_book = pages[0].book() if pages else None
                    self._project_open = True
                    return True
            except:
                pass
            
            # 创建新项目
            self._current_book = op.new_book()
            self._project_open = True
            return True
        except ImportError:
            raise RuntimeError("originpro 包未安装，请先运行：pip install originpro")
        except Exception as e:
            raise RuntimeError(f"Origin 启动失败：{e}")
    
    async def new_project(self) -> Dict[str, Any]:
        """创建新项目"""
        op = self._import()
        book = op.new_book()
        self._current_book = book
        return {"success": True, "book": book.name}
    
    async def open_project(self, path: str) -> Dict[str, Any]:
        """打开项目文件"""
        op = self._import()
        book = op.open(path)
        self._current_book = book
        return {"success": True, "book": book.name, "path": path}
    
    async def save_project(self, path: str) -> Dict[str, Any]:
        """保存项目"""
        op = self._import()
        op.save(path)
        return {"success": True, "path": path}
    
    async def close_project(self) -> bool:
        """关闭当前项目"""
        op = self._import()
        op.project.close()
        self._current_book = None
        return True
    
    async def stop(self) -> bool:
        """退出 Origin"""
        op = self._import()
        op.exit()
        return True
    
    # ========== 工作表操作 ==========
    
    async def create_sheet(self, name: str = "Data") -> Dict[str, Any]:
        """创建工作表"""
        op = self._import()
        ws = op.new_sheet(lname=name)
        return {"success": True, "sheet": ws.name, "range": ws.lt_range()}
    
    async def set_data(self, col_index: int, data: List[Union[int, float]], 
                       axis: str = '', lname: str = '') -> Dict[str, Any]:
        """设置列数据"""
        op = self._import()
        ws = op.active_sheet()
        ws.from_list(col_index, data, axis=axis, lname=lname)
        return {"success": True, "column": col_index, "rows": len(data)}
    
    async def import_csv(self, csv_file: str, sheet_name: str = "Data") -> Dict[str, Any]:
        """导入 CSV 文件"""
        op = self._import()
        ws = op.new_sheet(lname=sheet_name)
        ws.from_file(csv_file)
        return {"success": True, "sheet": ws.name, "file": csv_file}
    
    async def get_data(self, col_index: int) -> Dict[str, Any]:
        """获取列数据"""
        op = self._import()
        ws = op.active_sheet()
        data = ws.to_list(col_index)
        return {"success": True, "column": col_index, "data": data}
    
    # ========== 图表操作 ==========
    
    async def create_plot(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        创建图表
        
        Args:
            data: 绘图数据
                - x: X 轴数据列表
                - y: Y 轴数据列表  
                - type: 图表类型 (line, scatter, column, bar, pie)
                - title: 图表标题
                - xlabel: X 轴标签
                - ylabel: Y 轴标签
        """
        op = self._import()
        
        # 创建工作表
        ws = op.new_sheet(lname="PlotData")
        
        # 添加数据
        x_data = data.get("x", [])
        y_data = data.get("y", [])
        
        ws.from_list(0, x_data, axis='X', lname=data.get("xlabel", "X"))
        ws.from_list(1, y_data, axis='Y', lname=data.get("ylabel", "Y"))
        
        # 创建图表
        template = data.get("type", "line")
        graph = op.new_graph(template=template)
        self._current_graph = graph
        
        # 添加绘图
        layer = graph[0]
        plot = layer.add_plot(ws, colx=0, coly=1, type=template)
        plot.color = data.get("color", "#167BB2")
        
        # 设置标题
        if "title" in data:
            title_label = layer.label('Title')
            if title_label:
                title_label.text = data["title"]
        
        # 设置抗锯齿
        graph.set_int('aa', 1)
        
        return {
            "success": True,
            "graph": graph.name,
            "points": len(y_data),
            "type": template
        }
    
    async def add_plot(self, x_col: int, y_col: int, 
                       plot_type: str = "line") -> Dict[str, Any]:
        """在当前图表中添加绘图"""
        op = self._import()
        
        if self._current_graph is None:
            return {"success": False, "error": "No active graph"}
        
        ws = op.active_sheet()
        layer = self._current_graph[0]
        plot = layer.add_plot(ws, colx=x_col, coly=y_col, type=plot_type)
        
        return {"success": True, "plot": plot}
    
    async def set_axis(self, layer_index: int = 0, 
                       xlabel: str = None, ylabel: str = None,
                       title: str = None) -> Dict[str, Any]:
        """设置轴标签和标题"""
        if self._current_graph is None:
            return {"success": False, "error": "No active graph"}
        
        layer = self._current_graph[layer_index]
        
        if xlabel:
            layer.xlabel = xlabel
        if ylabel:
            layer.ylabel = ylabel
        if title:
            layer.label('Title').text = title
        
        return {"success": True}
    
    async def set_scale(self, layer_index: int = 0,
                        x_begin: float = None, x_end: float = None,
                        y_begin: float = None, y_end: float = None,
                        x_log: bool = False, y_log: bool = False) -> Dict[str, Any]:
        """设置坐标轴范围和刻度"""
        if self._current_graph is None:
            return {"success": False, "error": "No active graph"}
        
        layer = self._current_graph[layer_index]
        
        if x_begin is not None and x_end is not None:
            layer.set_xlim(begin=x_begin, end=x_end)
        if y_begin is not None and y_end is not None:
            layer.set_ylim(begin=y_begin, end=y_end)
        
        # 对数刻度 (2=log, 1=linear)
        if x_log:
            layer.xscale = 2
        if y_log:
            layer.yscale = 2
        
        return {"success": True}
    
    # ========== 导出 ==========
    
    async def save_graph(self, path: str, dpi: int = 300) -> Dict[str, Any]:
        """
        导出图表为图片
        
        Args:
            path: 输出文件路径 (.png, .jpg, .tiff, .bmp)
            dpi: DPI (默认 300)
        """
        op = self._import()
        
        if self._current_graph is None:
            # 使用活动图表
            graph = op.active_obj
        else:
            graph = self._current_graph
        
        if graph:
            graph.set_int('aa', 1)  # 抗锯齿
            graph.save_fig(path)
            return {"success": True, "path": path}
        else:
            return {"success": False, "error": "No graph to export"}
    
    async def export_pdf(self, path: str) -> Dict[str, Any]:
        """导出为 PDF"""
        op = self._import()
        op.save(path)  # Origin 可以直接保存为 PDF
        return {"success": True, "path": path}
    
    # ========== 批量处理 ==========
    
    async def batch_plot(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        批量处理 CSV 文件并绘图
        
        Args:
            config: 配置
                - input_folder: 输入文件夹
                - pattern: 文件匹配模式 (如 *.csv)
                - output_folder: 输出文件夹
                - plot_type: 图表类型
        """
        op = self._import()
        import glob
        
        input_folder = Path(config["input_folder"])
        pattern = config.get("pattern", "*.csv")
        output_folder = Path(config.get("output_folder", input_folder))
        
        output_folder.mkdir(parents=True, exist_ok=True)
        
        results = []
        csv_files = list(input_folder.glob(pattern))
        
        for csv_file in csv_files:
            try:
                # 创建新项目
                op.new_book()
                
                # 导入 CSV
                ws = op.new_sheet(lname=csv_file.stem)
                ws.from_file(str(csv_file))
                
                # 创建图表
                plot_type = config.get("plot_type", "line")
                graph = op.new_graph(template=plot_type)
                layer = graph[0]
                layer.add_plot(ws, colx=0, coly=1, type=plot_type)
                
                # 导出
                output_path = output_folder / f"{csv_file.stem}.png"
                graph.save_fig(str(output_path))
                
                results.append({
                    "file": str(csv_file),
                    "output": str(output_path),
                    "success": True
                })
                
                # 关闭项目
                op.project.close()
                
            except Exception as e:
                results.append({
                    "file": str(csv_file),
                    "error": str(e),
                    "success": False
                })
        
        return {
            "total": len(results),
            "success": sum(1 for r in results if r["success"]),
            "failed": sum(1 for r in results if not r["success"]),
            "results": results
        }
    
    # ========== 工具函数 ==========
    
    async def get_version(self) -> Dict[str, Any]:
        """获取 Origin 版本"""
        op = self._import()
        version = op.org_ver()
        return {"success": True, "version": version}
    
    async def get_active_sheet(self) -> Dict[str, Any]:
        """获取当前活动工作表"""
        op = self._import()
        try:
            ws = op.active_sheet()
        except AttributeError:
            # Origin 2021 使用 active_layer 返回工作表
            layer = op.active_layer()
            ws = layer.book().sheets()[0] if layer else None
        
        if ws is None:
            return {"success": False, "error": "No active sheet"}
        
        return {
            "success": True,
            "name": ws.name,
            "range": ws.lt_range(),
            "shape": ws.shape
        }
    
    async def rescale(self, layer_index: int = 0) -> Dict[str, Any]:
        """重新缩放坐标轴以适应数据"""
        if self._current_graph is None:
            return {"success": False, "error": "No active graph"}
        
        layer = self._current_graph[layer_index]
        layer.rescale()
        return {"success": True}


# ========== 快捷函数 ==========

async def quick_plot(data: Dict[str, Any], output: str) -> Dict[str, Any]:
    """快速绘图并导出"""
    service = OriginService()
    await service.start()
    await service.create_plot(data)
    result = await service.save_graph(output)
    await service.stop()
    return result


async def quick_import_plot(csv_file: str, output: str, 
                            plot_type: str = "line") -> Dict[str, Any]:
    """快速导入 CSV 并绘图"""
    service = OriginService()
    await service.start()
    await service.import_csv(csv_file)
    await service.create_plot({"type": plot_type})
    result = await service.save_graph(output)
    await service.stop()
    return result
