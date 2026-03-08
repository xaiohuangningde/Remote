import requests
import re
import json

# 更多比赛官网需要验证
competitions = [
    # 编程/算法类
    ('ACM-ICPC', 'https://icpc.global'),
    ('蓝桥杯', 'https://www.lanqiao.cn'),
    ('百度之星', 'https://astar.baidu.com'),
    ('CCPC 中国大学生程序设计大赛', 'https://www.ccpc.io'),
    
    # 设计/广告类
    ('全国大学生广告艺术大赛', 'https://www.sun-ad.com'),
    ('未来设计师全国高校数字艺术设计大赛', 'https://www.ncda.org.cn'),
    ('米兰设计周', 'https://www.milanodesignweek.org'),
    
    # 机器人/智能类
    ('全国大学生机器人大赛', 'http://www.curc.cn'),
    ('全国大学生智能汽车竞赛', 'https://www.smartcar.cn'),
    ('中国机器人大赛', 'http://www.chinarobot.org'),
    
    # 英语/翻译类
    ('外研社杯', 'https://www.fltrp.com'),
    ('21 世纪杯英语演讲', 'https://www.21stcentury.com.cn'),
    ('CATTI 杯翻译大赛', 'https://www.catticenter.com'),
    
    # 其他
    ('全国大学生电子设计竞赛', 'http://www.nuedc-training.com.cn'),
    ('全国大学生机械创新设计大赛', 'http://www.nmec.org.cn'),
]

print('批量验证比赛官网...\n')
print('=' * 80)

results = []

for name, url in competitions:
    print(f'\n{name}')
    print(f'URL: {url}')
    result = {'name': name, 'url': url, 'status': 'unknown'}
    
    try:
        response = requests.get(url, timeout=10, verify=True)
        status = response.status_code
        
        content = response.text[:2000]
        has_chinese = any('\u4e00' <= c <= '\u9fff' for c in content)
        
        # 提取标题
        title_match = re.search(r'<title>([^<]+)</title>', content, re.IGNORECASE)
        title = title_match.group(1)[:80] if title_match else 'N/A'
        
        # 检查年份
        has_2026 = '2026' in content
        has_2025 = '2025' in content
        
        print(f'  状态码：{status}')
        print(f'  响应时间：{response.elapsed.total_seconds():.2f}s')
        print(f'  标题：{title}')
        print(f'  中文：{has_chinese}')
        print(f'  2026 内容：{has_2026}')
        print(f'  2025 内容：{has_2025}')
        
        result['status'] = 'ok'
        result['status_code'] = status
        result['title'] = title
        result['has_chinese'] = has_chinese
        result['has_2026'] = has_2026
        result['has_2025'] = has_2025
        result['response_time'] = response.elapsed.total_seconds()
        print('  [OK] 可访问')
        
    except Exception as e:
        print(f'  [ERROR] {str(e)[:60]}')
        result['status'] = 'error'
        result['error'] = str(e)
    
    results.append(result)
    print('-' * 60)

# 保存结果
with open('C:\\Users\\12132\\.openclaw\\workspace\\tasks\\more_competitions_verify.json', 'w', encoding='utf-8') as f:
    json.dump(results, fp=f, ensure_ascii=False, indent=2)

print('\n' + '=' * 80)
success = len([r for r in results if r['status'] == 'ok'])
failed = len([r for r in results if r['status'] == 'error'])
print(f'验证完成：{len(results)} 个比赛')
print(f'成功：{success}')
print(f'失败：{failed}')
print('\n结果已保存：more_competitions_verify.json')

# 统计
ok_results = [r for r in results if r['status'] == 'ok']
if ok_results:
    print('\n可访问的比赛官网:')
    for r in ok_results:
        if r.get('has_2026'):
            icon = '[2026]'
        elif r.get('has_2025'):
            icon = '[2025]'
        else:
            icon = '[无最新]'
        print(f'  {icon} {r["name"]}: {r["url"]}')
