/**
 * CLI-Anything Skill - AI Agent 可控 CLI 工具生成器
 * 
 * 封装 CLI-Anything 项目，支持 GIMP/Blender/Inkscape/Audacity/LibreOffice/OBS 等软件
 * 
 * @package cli-anything
 * @version 1.0.0
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync } from 'fs'
import { join } from 'path'

const execAsync = promisify(exec)

// ==================== Types ====================

export interface SoftwareInfo {
  name: string
  cliCommand: string
  location: string
  installed: boolean
}

export interface CLIResult {
  success: boolean
  output: string
  error?: string
}

export interface CLIAnythingConfig {
  basePath: string
  defaultSoftware?: string
}

// ==================== Supported Software ====================

const SUPPORTED_SOFTWARE: Record<string, SoftwareInfo> = {
  gimp: {
    name: 'GIMP',
    cliCommand: 'cli-anything-gimp',
    location: 'D:/github PROJECT/CLI-Anything/gimp/agent-harness',
    installed: false,
  },
  blender: {
    name: 'Blender',
    cliCommand: 'cli-anything-blender',
    location: 'D:/github PROJECT/CLI-Anything/blender/agent-harness',
    installed: false,
  },
  inkscape: {
    name: 'Inkscape',
    cliCommand: 'cli-anything-inkscape',
    location: 'D:/github PROJECT/CLI-Anything/inkscape/agent-harness',
    installed: false,
  },
  audacity: {
    name: 'Audacity',
    cliCommand: 'cli-anything-audacity',
    location: 'D:/github PROJECT/CLI-Anything/audacity/agent-harness',
    installed: false,
  },
  libreoffice: {
    name: 'LibreOffice',
    cliCommand: 'cli-anything-libreoffice',
    location: 'D:/github PROJECT/CLI-Anything/libreoffice/agent-harness',
    installed: false,
  },
  obs: {
    name: 'OBS Studio',
    cliCommand: 'cli-anything-obs-studio',
    location: 'D:/github PROJECT/CLI-Anything/obs-studio/agent-harness',
    installed: false,
  },
  kdenlive: {
    name: 'Kdenlive',
    cliCommand: 'cli-anything-kdenlive',
    location: 'D:/github PROJECT/CLI-Anything/kdenlive/agent-harness',
    installed: false,
  },
  shotcut: {
    name: 'Shotcut',
    cliCommand: 'cli-anything-shotcut',
    location: 'D:/github PROJECT/CLI-Anything/shotcut/agent-harness',
    installed: false,
  },
  drawio: {
    name: 'Draw.io',
    cliCommand: 'cli-anything-drawio',
    location: 'D:/github PROJECT/CLI-Anything/drawio/agent-harness',
    installed: false,
  },
}

// ==================== Main Class ====================

export class CLIAnythingService {
  private config: CLIAnythingConfig
  private basePath: string

  constructor(config?: Partial<CLIAnythingConfig>) {
    this.basePath = config?.basePath || 'D:/github PROJECT/CLI-Anything'
    this.config = {
      basePath: this.basePath,
      defaultSoftware: config?.defaultSoftware,
    }
  }

  /**
   * 获取支持的软件列表
   */
  async getSupportedSoftware(): Promise<SoftwareInfo[]> {
    const softwareList = Object.values(SUPPORTED_SOFTWARE)
    
    // 检查每个软件是否已安装
    for (const software of softwareList) {
      try {
        await execAsync(`${software.cliCommand} --version`)
        software.installed = true
      } catch {
        software.installed = false
      }
    }
    
    return softwareList
  }

  /**
   * 安装指定软件的 CLI 工具
   */
  async install(software: string): Promise<CLIResult> {
    const target = SUPPORTED_SOFTWARE[software.toLowerCase()]
    
    if (!target) {
      return {
        success: false,
        output: '',
        error: `不支持的软件：${software}`,
      }
    }

    try {
      const installPath = join(this.basePath, software, 'agent-harness')
      await execAsync(`cd "${installPath}" && pip install -e .`)
      
      target.installed = true
      
      return {
        success: true,
        output: `${target.name} CLI 安装成功`,
      }
    } catch (error: any) {
      return {
        success: false,
        output: '',
        error: error.stderr || error.message,
      }
    }
  }

  /**
   * 执行 CLI 命令
   */
  async execute(software: string, args: string[]): Promise<CLIResult> {
    const target = SUPPORTED_SOFTWARE[software.toLowerCase()]
    
    if (!target) {
      return {
        success: false,
        output: '',
        error: `不支持的软件：${software}`,
      }
    }

    if (!target.installed) {
      // 尝试自动安装
      const installResult = await this.install(software)
      if (!installResult.success) {
        return installResult
      }
    }

    try {
      const command = `${target.cliCommand} ${args.join(' ')}`
      const { stdout, stderr } = await execAsync(command)
      
      return {
        success: true,
        output: stdout,
        error: stderr,
      }
    } catch (error: any) {
      return {
        success: false,
        output: error.stdout || '',
        error: error.stderr || error.message,
      }
    }
  }

  /**
   * GIMP 专用方法：创建新项目
   */
  async gimpCreateProject(width: number, height: number, output: string): Promise<CLIResult> {
    return this.execute('gimp', [
      'project', 'new',
      '--width', width.toString(),
      '--height', height.toString(),
      '-o', output,
    ])
  }

  /**
   * GIMP 专用方法：添加图层
   */
  async gimpAddLayer(name: string, type: string = 'solid', color?: string): Promise<CLIResult> {
    const args = ['--json', 'layer', 'add', '-n', name, '--type', type]
    if (color) {
      args.push('--color', color)
    }
    return this.execute('gimp', args)
  }

  /**
   * Blender 专用方法：创建场景
   */
  async blenderCreateScene(output: string): Promise<CLIResult> {
    return this.execute('blender', ['scene', 'new', '-o', output])
  }

  /**
   * Blender 专用方法：添加对象
   */
  async blenderAddObject(type: string, location: [number, number, number]): Promise<CLIResult> {
    return this.execute('blender', [
      'object', 'add',
      '--type', type,
      '--location', ...location.map(String),
    ])
  }

  /**
   * 检查 CLI 工具是否可用
   */
  async isAvailable(software: string): Promise<boolean> {
    const target = SUPPORTED_SOFTWARE[software.toLowerCase()]
    if (!target) return false

    try {
      await execAsync(`${target.cliCommand} --help`)
      return true
    } catch {
      return false
    }
  }

  /**
   * 获取帮助信息
   */
  async getHelp(software: string): Promise<CLIResult> {
    return this.execute(software, ['--help'])
  }
}

// ==================== Factory Function ====================

export function createCLIAnything(config?: Partial<CLIAnythingConfig>): CLIAnythingService {
  return new CLIAnythingService(config)
}

// ==================== Exports ====================

export default CLIAnythingService
