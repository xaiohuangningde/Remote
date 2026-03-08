import requests
import re
from datetime import datetime

# 验证比赛官网
websites = [
    ('全国大学生数学建模竞赛', 'https://www.mcm.edu.cn'),
    ('挑战杯', 'https://tiaozhanbei.net'),
    ('中国国际大学生创新大赛', 'https://cy.ncss.cn'),
    ('美国大学生数学建模竞赛', 'https://www.comap.com/contests'),
]

print('验证比赛官网真实性...\n')
print('=' * 70)

results = []

for name, url in websites:
    print(f'\n{name}: {url}')
    print('-' * 50)
    result = {'name': name, 'url': url, 'status': 'unknown'}
    
    try:
        # 发送请求
        response = requests.get(url, timeout=10, verify=True)
        status = response.status_code
        
        # 检查响应
        print(f'  状态码：{status}')
        print(f'  响应时间：{response.elapsed.total_seconds():.2f}秒')
        print(f'  内容长度：{len(response.content)} 字节')
        
        # 检查是否有中文内容（判断是否为中国网站）
        content = response.text[:3000]
        has_chinese = any('\u4e00' <= c <= '\u9fff' for c in content)
        print(f'  包含中文：{has_chinese}')
        
        # 提取标题
        title_match = re.search(r'<title>([^<]+)</title>', content, re.IGNORECASE)
        if title_match:
            title = title_match.group(1)[:100]
            print(f'  页面标题：{title}')
            result['title'] = title
        
        # 检查是否有最新内容（2025-2026）
        has_2026 = '2026' in content
        has_2025 = '2025' in content
        print(f'  包含 2026 年内容：{has_2026}')
        print(f'  包含 2025 年内容：{has_2025}')
        
        # 查找通知/新闻链接
        links = re.findall(r'href=["\']([^"\']+)["\']', content)
        news_links = [l for l in links if any(k in l.lower() for k in ['news', 'notice', 'list', 'detail'])][:5]
        if news_links:
            print(f'  找到相关链接：{len(news_links)}个')
            for link in news_links[:3]:
                full_link = url + link if link.startswith('/') else link
                print(f'    - {full_link[:80]}')
        
        # 保存内容样本
        result['content_sample'] = content[:1000]
        result['has_2026'] = has_2026
        result['has_2025'] = has_2025
        result['status'] = 'ok'
        result['status_code'] = status
        print('  [OK] 网站可访问')
        
    except requests.exceptions.SSLError as e:
        print('  [ERROR] SSL 证书错误：' + str(e)[:50])
        result['status'] = 'ssl_error'
        result['error'] = str(e)
    except requests.exceptions.ConnectionError as e:
        print('  [ERROR] 连接失败：' + str(e)[:50])
        result['status'] = 'connection_error'
        result['error'] = str(e)
    except requests.exceptions.Timeout:
        print('  [ERROR] 超时')
        result['status'] = 'timeout'
    except Exception as e:
        print('  [ERROR] 错误：' + str(e)[:50])
        result['status'] = 'error'
        result['error'] = str(e)
    
    results.append(result)

print('\n' + '=' * 70)
print('验证完成')

# 保存结果
import json
with open('C:\\Users\\12132\\.openclaw\\workspace\\tasks\\website_verification.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(f'\n结果已保存到：website_verification.json')

# 生成摘要报告
print('\n\n=== 摘要报告 ===\n')
for r in results:
    status_icon = '[OK]' if r['status'] == 'ok' else '[ERROR]'
    print(f"{status_icon} {r['name']}: {r['status']}")
    if r['status'] == 'ok':
        has_latest = r.get('has_2026') or r.get('has_2025')
        latest_str = '[OK] 有 2025-2026 内容' if has_latest else '[WARN] 无最新内容'
        print(f"   最新内容：{latest_str}")
