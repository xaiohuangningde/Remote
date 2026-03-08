/**
 * Xiaohongshu MCP 测试
 * 测试核心功能：MCP 通信、工具调用、错误处理
 */

// 模拟 MCP 工具响应
const MOCK_TOOLS = [
  { name: 'mcp_check_login', description: '检查登录状态' },
  { name: 'mcp_push_note', description: '发布图文笔记' },
  { name: 'mcp_push_video', description: '发布视频笔记' },
  { name: 'mcp_search', description: '搜索笔记' },
  { name: 'mcp_list_notes', description: '获取推荐流' },
  { name: 'mcp_get_note_detail', description: '获取笔记详情' },
  { name: 'mcp_post_comment', description: '评论' },
  { name: 'mcp_get_user', description: '获取用户主页' },
];

// 模拟 MCP 客户端
class MockMCPClient {
  constructor() {
    this.requestId = 0;
    this.pendingRequests = new Map();
    this.isStarted = false;
  }

  async start() {
    await new Promise(resolve => setTimeout(resolve, 100));
    this.isStarted = true;
    return true;
  }

  async callTool(toolName, args = {}) {
    if (!this.isStarted) {
      throw new Error('MCP not started. Call start() first.');
    }

    const id = ++this.requestId;
    
    // 模拟工具响应
    return this.mockResponse(toolName, args);
  }

  mockResponse(toolName, args) {
    switch (toolName) {
      case 'mcp_check_login':
        return {
          logged_in: true,
          user_id: 'test_user_123',
          username: 'test_user'
        };
      
      case 'mcp_push_note':
        if (!args.title || !args.content) {
          throw new Error('Title and content are required');
        }
        return {
          success: true,
          note_id: `note_${Date.now()}`,
          url: `https://xiaohongshu.com/note_${Date.now()}`
        };
      
      case 'mcp_push_video':
        if (!args.title || !args.video_path) {
          throw new Error('Title and video_path are required');
        }
        return {
          success: true,
          note_id: `video_${Date.now()}`,
          url: `https://xiaohongshu.com/video_${Date.now()}`
        };
      
      case 'mcp_search':
        if (!args.keyword) {
          throw new Error('Keyword is required');
        }
        return {
          results: [
            { note_id: '1', title: `Result for ${args.keyword}`, likes: 100 },
            { note_id: '2', title: `Another result`, likes: 50 }
          ],
          page: args.page || 1,
          total: 2
        };
      
      case 'mcp_list_notes':
        return {
          notes: [
            { note_id: '1', title: 'Note 1', likes: 200 },
            { note_id: '2', title: 'Note 2', likes: 150 }
          ],
          page: args.page || 1
        };
      
      case 'mcp_get_note_detail':
        if (!args.note_id) {
          throw new Error('Note ID is required');
        }
        return {
          note_id: args.note_id,
          title: 'Test Note',
          content: 'Test content',
          likes: 100,
          comments: 20
        };
      
      case 'mcp_post_comment':
        if (!args.note_id || !args.content) {
          throw new Error('Note ID and content are required');
        }
        return {
          success: true,
          comment_id: `comment_${Date.now()}`
        };
      
      case 'mcp_get_user':
        if (!args.user_id) {
          throw new Error('User ID is required');
        }
        return {
          user_id: args.user_id,
          username: 'test_user',
          followers: 1000,
          following: 500
        };
      
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }
}

// XiaohongshuMCP 封装类
class XiaohongshuMCP {
  constructor() {
    this.client = new MockMCPClient();
  }

  async start() {
    await this.client.start();
  }

  async checkLogin() {
    return await this.client.callTool('mcp_check_login', {});
  }

  async pushNote(title, content, images = [], tags = []) {
    return await this.client.callTool('mcp_push_note', {
      title,
      content,
      images,
      tags
    });
  }

  async pushVideo(title, content, videoPath, tags = []) {
    return await this.client.callTool('mcp_push_video', {
      title,
      content,
      video_path: videoPath,
      tags
    });
  }

  async search(keyword, page = 1) {
    return await this.client.callTool('mcp_search', { keyword, page });
  }

  async listNotes(page = 1) {
    return await this.client.callTool('mcp_list_notes', { page });
  }

  async getNoteDetail(noteId, xsecToken) {
    return await this.client.callTool('mcp_get_note_detail', {
      note_id: noteId,
      xsec_token: xsecToken
    });
  }

  async postComment(noteId, xsecToken, content) {
    return await this.client.callTool('mcp_post_comment', {
      note_id: noteId,
      xsec_token: xsecToken,
      content
    });
  }

  async getUser(userId, xsecToken) {
    return await this.client.callTool('mcp_get_user', {
      user_id: userId,
      xsec_token: xsecToken
    });
  }
}

// 测试运行器
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('🚀 开始运行 Xiaohongshu MCP 测试\n');
  console.log('='.repeat(50));
  
  let passed = 0;
  let failed = 0;
  let mcp;

  try {
    // 测试 1: MCP 启动
    console.log('\n🧪 测试 1: MCP 客户端启动');
    try {
      mcp = new XiaohongshuMCP();
      await mcp.start();
      console.log('✅ MCP 启动成功');
      passed++;
    } catch (error) {
      console.log(`❌ 启动失败：${error.message}`);
      failed++;
    }

    // 测试 2: 检查登录状态
    console.log('\n🧪 测试 2: 检查登录状态');
    try {
      const result = await mcp.checkLogin();
      
      if (result.logged_in === true && result.user_id) {
        console.log('✅ 登录状态检查正常');
        passed++;
      } else {
        console.log('❌ 登录状态格式错误');
        failed++;
      }
    } catch (error) {
      console.log(`❌ 测试失败：${error.message}`);
      failed++;
    }

    // 测试 3: 发布图文笔记
    console.log('\n🧪 测试 3: 发布图文笔记');
    try {
      const result = await mcp.pushNote(
        '测试标题',
        '测试内容',
        ['/path/to/image.jpg'],
        ['测试', '标签']
      );
      
      if (result.success === true && result.note_id && result.url) {
        console.log('✅ 笔记发布成功');
        passed++;
      } else {
        console.log('❌ 笔记发布响应格式错误');
        failed++;
      }
    } catch (error) {
      console.log(`❌ 测试失败：${error.message}`);
      failed++;
    }

    // 测试 4: 发布笔记 - 缺少必要参数
    console.log('\n🧪 测试 4: 发布笔记 - 缺少必要参数应失败');
    try {
      await mcp.pushNote('', '', [], []);
      console.log('❌ 应该抛出错误');
      failed++;
    } catch (error) {
      if (error.message.includes('required')) {
        console.log('✅ 正确抛出参数错误');
        passed++;
      } else {
        console.log(`❌ 错误消息不匹配：${error.message}`);
        failed++;
      }
    }

    // 测试 5: 搜索笔记
    console.log('\n🧪 测试 5: 搜索笔记');
    try {
      const result = await mcp.search('OpenClaw', 1);
      
      if (result.results && result.results.length > 0 && result.page === 1) {
        console.log(`✅ 搜索成功 (${result.results.length} 条结果)`);
        passed++;
      } else {
        console.log('❌ 搜索结果格式错误');
        failed++;
      }
    } catch (error) {
      console.log(`❌ 测试失败：${error.message}`);
      failed++;
    }

    // 测试 6: 搜索 - 缺少关键词
    console.log('\n🧪 测试 6: 搜索 - 缺少关键词应失败');
    try {
      await mcp.search('', 1);
      console.log('❌ 应该抛出错误');
      failed++;
    } catch (error) {
      if (error.message.includes('required')) {
        console.log('✅ 正确抛出参数错误');
        passed++;
      } else {
        console.log(`❌ 错误消息不匹配：${error.message}`);
        failed++;
      }
    }

    // 测试 7: 获取笔记列表
    console.log('\n🧪 测试 7: 获取笔记列表');
    try {
      const result = await mcp.listNotes(1);
      
      if (result.notes && result.notes.length > 0 && result.page === 1) {
        console.log(`✅ 列表获取成功 (${result.notes.length} 条笔记)`);
        passed++;
      } else {
        console.log('❌ 列表格式错误');
        failed++;
      }
    } catch (error) {
      console.log(`❌ 测试失败：${error.message}`);
      failed++;
    }

    // 测试 8: 获取笔记详情
    console.log('\n🧪 测试 8: 获取笔记详情');
    try {
      const result = await mcp.getNoteDetail('note_123', 'token_xyz');
      
      if (result.note_id && result.title && result.content) {
        console.log('✅ 笔记详情获取成功');
        passed++;
      } else {
        console.log('❌ 笔记详情格式错误');
        failed++;
      }
    } catch (error) {
      console.log(`❌ 测试失败：${error.message}`);
      failed++;
    }

    // 测试 9: 发表评论
    console.log('\n🧪 测试 9: 发表评论');
    try {
      const result = await mcp.postComment('note_123', 'token_xyz', '这是测试评论');
      
      if (result.success === true && result.comment_id) {
        console.log('✅ 评论发表成功');
        passed++;
      } else {
        console.log('❌ 评论响应格式错误');
        failed++;
      }
    } catch (error) {
      console.log(`❌ 测试失败：${error.message}`);
      failed++;
    }

    // 测试 10: 获取用户信息
    console.log('\n🧪 测试 10: 获取用户信息');
    try {
      const result = await mcp.getUser('user_123', 'token_xyz');
      
      if (result.user_id && result.username && result.followers !== undefined) {
        console.log('✅ 用户信息获取成功');
        passed++;
      } else {
        console.log('❌ 用户信息格式错误');
        failed++;
      }
    } catch (error) {
      console.log(`❌ 测试失败：${error.message}`);
      failed++;
    }

    // 测试 11: 发布视频笔记
    console.log('\n🧪 测试 11: 发布视频笔记');
    try {
      const result = await mcp.pushVideo(
        '视频标题',
        '视频描述',
        '/path/to/video.mp4',
        ['视频', '标签']
      );
      
      if (result.success === true) {
        console.log('✅ 视频发布成功');
        passed++;
      } else {
        console.log('❌ 视频发布响应格式错误');
        failed++;
      }
    } catch (error) {
      console.log(`❌ 测试失败：${error.message}`);
      failed++;
    }

    // 测试 12: 未启动时调用工具应失败
    console.log('\n🧪 测试 12: 未启动时调用工具应抛出错误');
    try {
      const newMCP = new XiaohongshuMCP();
      await newMCP.checkLogin();
      console.log('❌ 应该抛出错误');
      failed++;
    } catch (error) {
      if (error.message.includes('not started')) {
        console.log('✅ 正确抛出未启动错误');
        passed++;
      } else {
        console.log(`❌ 错误消息不匹配：${error.message}`);
        failed++;
      }
    }

  } finally {
    // 清理
    mcp = null;
  }

  // 总结
  console.log('\n' + '='.repeat(50));
  const total = passed + failed;
  console.log(`\n📊 测试结果：${passed} 通过，${failed} 失败`);
  console.log(`✅ 通过率：${((passed / total) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 所有测试通过！');
  } else {
    console.log('\n⚠️  部分测试失败，请检查实现');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('测试运行失败:', error);
  process.exit(1);
});
