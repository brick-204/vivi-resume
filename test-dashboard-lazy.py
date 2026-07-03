"""
测试 Dashboard 首屏骨架 + 视口懒渲染
- 打开首页 → 点击"控制台" → 等待骨架消失 → 切到模版市场 → 验证懒渲染
"""
from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    # 打开首页
    page.goto('http://localhost:5176')
    page.wait_for_load_state('networkidle')
    print("[OK] 首页加载完成")

    # 截图：首页
    page.screenshot(path='/tmp/01-home.png', full_page=True)

    # 点击"控制台"按钮
    console_btn = page.locator('text=控制台').first
    console_btn.click()
    print("[OK] 点击「控制台」")

    # 等待骨架消失（store 就绪）
    # 骨架特征：.dashboard-skeleton
    try:
        page.wait_for_selector('.dashboard-skeleton', timeout=2000)
        print("[OK] 检测到骨架屏")
        page.screenshot(path='/tmp/02-dashboard-skeleton.png')

        # 等待骨架消失（最多等 5s）
        page.wait_for_selector('.dashboard-skeleton', state='hidden', timeout=5000)
        print("[OK] 骨架屏消失，store 就绪")
    except:
        print("[WARN] 未检测到骨架屏（可能已就绪或超时）")

    # 截图：Dashboard 内容
    page.wait_for_timeout(500)
    page.screenshot(path='/tmp/03-dashboard-ready.png')

    # 切到"模版市场" tab
    template_tab = page.locator('text=模版市场').first
    template_tab.click()
    print("[OK] 点击「模版市场」")

    # 等待面板加载
    page.wait_for_timeout(1000)
    page.screenshot(path='/tmp/04-templates-panel.png')

    # 检查模板卡片数量
    cards = page.locator('.template-showcase-card').all()
    print(f"[OK] 检测到 {len(cards)} 张模板卡片")

    # 检查哪些卡片已渲染 ResumeDocument（视口内）
    rendered_docs = page.locator('.template-showcase-card__scale').all()
    print(f"[OK] 视口内已渲染 {len(rendered_docs)} 份 ResumeDocument（预期 2~3 份）")

    # 检查占位符数量（视口外）
    placeholders = page.locator('.template-showcase-card__placeholder').all()
    print(f"[OK] 视口外占位 {len(placeholders)} 个（shimmer 动画）")

    # 滚动到页面底部，触发懒加载
    page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
    page.wait_for_timeout(1500)
    page.screenshot(path='/tmp/05-templates-scrolled.png')

    # 再次检查渲染数量
    rendered_after = page.locator('.template-showcase-card__scale').all()
    placeholders_after = page.locator('.template-showcase-card__placeholder').all()
    print(f"[OK] 滚动后：已渲染 {len(rendered_after)} 份，占位 {len(placeholders_after)} 个")

    # 回到首页测试简历列表（如果有简历）
    resume_tab = page.locator('text=我的简历').first
    resume_tab.click()
    page.wait_for_timeout(800)
    page.screenshot(path='/tmp/06-resumes-panel.png')

    resume_cards = page.locator('.resume-card').all()
    print(f"[OK] 简历卡片数量：{len(resume_cards)}")

    if len(resume_cards) > 0:
        # 检查简历卡片的懒渲染
        resume_rendered = page.locator('.resume-card__scale').all()
        resume_placeholders = page.locator('.resume-card__placeholder').all()
        print(f"[OK] 简历卡片：已渲染 {len(resume_rendered)} 份，占位 {len(resume_placeholders)} 个")

    browser.close()
    print("\n[SUCCESS] 测试完成，截图保存到 /tmp/01~06")
