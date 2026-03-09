#!/usr/bin/env node

/**
 * Symphony CLI - 独立系统入口
 * 
 * 使用方式:
 *   npx tsx cli.ts run --repo xaiohuangningde/symphony-test
 *   npx tsx cli.ts poll --workflow ./WORKFLOW.md
 *   npx tsx cli.ts status
 */

import { createSymphony } from './index.ts'
import { createLogger, getTodayMemoryFile } from './logger.ts'

interface Args {
  command: string
  workflow?: string
  repo?: string
  timeout?: number
  dryRun?: boolean
  verbose?: boolean
}

function parseArgs(): Args {
  const args: Args = { command: 'help' }
  
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i]
    
    if (arg === 'run' || arg === 'poll' || arg === 'status' || arg === 'help') {
      args.command = arg
    } else if (arg === '--workflow' || arg === '-w') {
      args.workflow = process.argv[++i]
    } else if (arg === '--repo' || arg === '-r') {
      args.repo = process.argv[++i]
    } else if (arg === '--timeout' || arg === '-t') {
      args.timeout = parseInt(process.argv[++i])
    } else if (arg === '--dry-run') {
      args.dryRun = true
    } else if (arg === '--verbose' || arg === '-v') {
      args.verbose = true
    }
  }
  
  return args
}

async function runCommand(args: Args) {
  const logger = createLogger('SymphonyCLI', {
    memoryFile: getTodayMemoryFile(),
    console: args.verbose ?? false,
  })
  
  switch (args.command) {
    case 'run': {
      logger.info('Starting Symphony run...')
      
      const symphony = await createSymphony({
        workflowPath: args.workflow || './WORKFLOW.md',
      })
      
      if (args.dryRun) {
        // Dry run: only fetch issues
        await symphony.start()
        const snapshot = await symphony.getSnapshot()
        console.log(`\n📊 Dry Run Results:`)
        console.log(`   Issues found: ${snapshot.running.length}`)
        await symphony.stop()
        return
      }
      
      // Full run
      await symphony.start()
      
      const timeout = args.timeout || 600000 // 10 分钟
      console.log(`\n⏳ Running for ${timeout / 1000}s...`)
      
      await new Promise(resolve => setTimeout(resolve, timeout))
      
      await symphony.stop()
      
      const snapshot = await symphony.getSnapshot()
      console.log(`\n✅ Symphony completed:`)
      console.log(`   Issues processed: ${snapshot.completed.length}`)
      console.log(`   Tokens used: ${snapshot.codex_totals.total_tokens}`)
      
      logger.info('Symphony run completed', { snapshot })
      break
    }
    
    case 'poll': {
      logger.info('Manual poll...')
      
      const symphony = await createSymphony({
        workflowPath: args.workflow || './WORKFLOW.md',
      })
      
      await symphony.start()
      await symphony.triggerPoll()
      
      const snapshot = await symphony.getSnapshot()
      console.log(`\n📊 Poll Results:`)
      console.log(`   Running: ${snapshot.running.length}`)
      console.log(`   Retrying: ${snapshot.retrying.length}`)
      
      await symphony.stop()
      break
    }
    
    case 'status': {
      const symphony = await createSymphony({
        workflowPath: args.workflow || './WORKFLOW.md',
      })
      
      const snapshot = await symphony.getSnapshot()
      console.log(`\n📊 Symphony Status:`)
      console.log(`   Running: ${snapshot.running.length}`)
      console.log(`   Retrying: ${snapshot.retrying.length}`)
      console.log(`   Completed: ${snapshot.completed.length}`)
      console.log(`   Tokens: ${snapshot.codex_totals.total_tokens}`)
      break
    }
    
    case 'help':
    default:
      console.log(`
🎵 Symphony CLI - GitHub Issue Auto-Processor

Usage:
  npx tsx cli.ts <command> [options]

Commands:
  run     Start Symphony and process issues
  poll    Manual poll for new issues
  status  Show current status
  help    Show this help

Options:
  --workflow, -w <path>  Path to WORKFLOW.md (default: ./WORKFLOW.md)
  --repo, -r <repo>      GitHub repo (owner/repo)
  --timeout, -t <ms>     Run timeout in ms (default: 600000)
  --dry-run              Fetch issues but don't process
  --verbose, -v          Enable verbose logging

Examples:
  npx tsx cli.ts run --repo xaiohuangningde/symphony-test
  npx tsx cli.ts poll --workflow ./WORKFLOW.md
  npx tsx cli.ts run --dry-run --verbose
`)
  }
}

// Main
try {
  const args = parseArgs()
  runCommand(args).catch(error => {
    console.error('❌ Error:', error.message)
    process.exit(1)
  })
} catch (error: any) {
  console.error('❌ Error:', error.message)
  process.exit(1)
}
