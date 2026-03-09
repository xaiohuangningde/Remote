// 检查工作空间配置
import { WorkflowLoader } from '../src/workflow-loader.ts'
import { ConfigLayer } from '../src/config.ts'

async function check() {
  const loader = new WorkflowLoader('./WORKFLOW.md')
  const workflow = await loader.load()
  const config = new ConfigLayer(workflow.config)
  
  const workspace = config.getWorkspace()
  console.log('WORKFLOW.md 中的 workspace.root:', workflow.config.workspace?.root)
  console.log('解析后的 workspace.root:', workspace.root)
  console.log('WORKSPACE_ROOT 环境变量:', process.env.WORKSPACE_ROOT)
}

check().catch(console.error)
