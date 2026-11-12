import argparse
import functools
import re
import threading
from contextlib import contextmanager
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import expect, sync_playwright


PROJECT = Path(__file__).resolve().parents[1]
CHROME = Path("C:/Program Files/Google/Chrome/Application/chrome.exe")
SAVE_KEY = "this-computer.save.v1"


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


def playthrough(page, url, screenshot, route):
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("response", lambda response: errors.append(f"{response.status} {response.url}")
            if response.status >= 400 and response.request.resource_type in {"script", "stylesheet", "image"}
            else None)

    def boot():
        page.locator("#boot").click()
        page.wait_for_function("document.fullscreenElement === document.documentElement")

    def desktop_app(name):
        page.locator(".retro-shortcut").filter(has_text=re.compile(f"^{name}$")).dblclick()

    def start_app(name):
        page.locator(".retro-start").click()
        page.locator(".retro-start-menu").get_by_role("button", name=name, exact=True).click()

    def file(file_id):
        page.locator(f".retro-window.is-active [data-file-id='{file_id}']").dblclick()

    def dismiss_dialog(message):
        dialog = page.get_by_role("dialog")
        expect(dialog).to_contain_text(message)
        dialog.get_by_role("button").last.click()

    def save():
        return page.evaluate("key => JSON.parse(localStorage.getItem(key))", SAVE_KEY)

    page.goto(url)
    boot()
    desktop_app("此电脑")
    explorer = page.locator('.retro-window[aria-label="此电脑"]')
    if screenshot:
        page.screenshot(path=screenshot)
    explorer.get_by_role("button", name="最大化").click()
    expect(explorer).to_have_class("retro-window is-active is-maximized")
    explorer.get_by_role("button", name="还原").click()
    explorer.get_by_role("button", name="最小化").click()
    expect(explorer).to_be_hidden()
    page.locator(".retro-task").filter(has_text="此电脑").click()
    expect(explorer).to_be_visible()
    bounds = explorer.bounding_box()
    resize = explorer.locator(".retro-resize").bounding_box()
    page.mouse.move(resize["x"] + resize["width"] / 2, resize["y"] + resize["height"] / 2)
    page.mouse.down()
    page.mouse.move(resize["x"] + 85, resize["y"] + 65, steps=4)
    page.mouse.up()
    assert explorer.bounding_box()["width"] > bounds["width"] + 50

    page.mouse.click(1120, 500, button="right")
    desktop_menu = page.locator(".retro-context")
    expect(desktop_menu.get_by_role("button", name="刷新")).to_be_visible()
    desktop_menu.get_by_role("button", name="刷新").click()

    file("d")
    explorer.get_by_role("button", name="向上").click()
    expect(explorer.locator("[data-file-id='c']")).to_be_visible()
    file("d")
    archive = explorer.locator("[data-file-id='archive']")
    archive.click(button="right")
    page.locator(".game-menu").get_by_role("button", name="删除", exact=True).click()
    expect(archive).to_have_count(0)
    desktop_app("回收站")
    page.locator("[data-restore-id='archive']").click()
    expect(archive).to_be_attached()
    desktop_app("此电脑")
    file("d")
    file("handover")
    if route == "service":
        desktop_app("搜索")
        search = page.locator("#file-search")
        search.fill("值班交接")
        search.press("Enter")
        page.locator("[data-search-id='handover-current']").click()
    else:
        file("handover-current")
    expect(page.locator(".retro-window.is-active textarea")).to_have_value(re.compile("今晚没有未完成的交接"))

    desktop_app("回收站")
    page.locator("[data-restore-id='handover-old']").click()
    page.locator("[data-open-restored='handover-old']").click()
    dismiss_dialog("当前桌面仍有人使用")
    expect(page.get_by_role("textbox", name="值班交接（旧版）.txt", exact=True)).to_have_value(re.compile("0417"))

    if route == "service":
        start_app("控制面板")
        expect(page.locator('.retro-window[aria-label="控制面板"]')).to_be_visible()
        desktop_app("本机消息")
        log = page.locator("#messenger-log")
        page.locator("[data-topic-id='identity']").click()
        expect(log).to_contain_text("我是这台桌面的恢复服务")
        page.locator("[data-topic-id='versions']").click()
        desktop_app("搜索")
        search = page.locator("#file-search")
        search.fill("交接签名校验")
        search.press("Enter")
        page.locator(".retro-window.is-active [data-search-id]").click()
        expect(page.get_by_role("textbox", name="交接签名校验.txt", exact=True)).to_be_visible()

        start_app("运行")
        page.locator("#run-command").fill("eventvwr")
        page.locator("#run-submit").click()
        expect(page.locator('.retro-window[aria-label="事件查看器"]')).to_be_visible()
    else:
        desktop_app("事件查看器")
    page.locator("[data-record-id='0417']").click()
    expect(page.locator(".retro-window.is-active")).to_contain_text("恢复来源：本机缓存")

    if route == "network":
        desktop_app("网上邻居")
        page.locator("#network-toggle").click()
        dismiss_dialog("正在恢复：你")
    else:
        desktop_app("任务管理器")
        service_toggle = page.locator("#service-toggle")
        expect(service_toggle).to_have_text("停止进程")
        service_toggle.click()
        dismiss_dialog("恢复提示：无")
        expect(service_toggle).to_have_text("启动进程")
        desktop_app("本机消息")
        expect(page.locator("[data-topic-id='identity']")).to_be_disabled()
        desktop_app("事件查看器")
        page.locator("[data-record-id='0417']").click()
        desktop_app("任务管理器")
        service_toggle.click()
        dismiss_dialog("恢复提示再次出现")

    desktop_app("交接记录")
    page.locator("#evidence-record").fill("0417")
    page.locator("#evidence-conclusion").select_option("local-recovery")
    page.locator("#evidence-submit").click()
    result = page.locator("#evidence-result")
    expect(result).to_contain_text("交接记录已封存")

    if route == "service":
        assert save()["online"] is True
        assert save()["story"]["controlled"] is True
        desktop_app("本机消息")
        page.locator("[data-topic-id='goodbye']").click()
        expect(page.locator("#messenger-log")).to_contain_text("我在工作区留了一份回执")
        desktop_app("搜索")
        search = page.locator("#file-search")
        search.fill("未发送的回复")
        search.press("Enter")
        page.locator(".retro-window.is-active [data-search-id]").click()
        expect(page.locator(".retro-window.is-active textarea")).to_have_value(re.compile("收件人：上一个会话"))
        desktop_app("交接记录")

    completed = save()
    assert completed, "The chapter should leave a save."
    page.locator(".retro-window.is-active").get_by_role("button", name="关机", exact=True).click()
    page.get_by_role("dialog").get_by_role("button", name="关机", exact=True).click()
    expect(page.locator("#boot")).to_have_text("继续交接")
    page.wait_for_function("!document.fullscreenElement")
    page.reload()
    assert save() == completed, "Reload should preserve the completed save."
    boot()
    desktop_app("交接记录")
    expect(page.locator(".retro-window.is-active")).to_contain_text("交接记录已封存")
    assert not errors, errors


@contextmanager
def serve_project():
    handler = functools.partial(QuietHandler, directory=PROJECT)
    with ThreadingHTTPServer(("127.0.0.1", 0), handler) as server:
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            yield f"http://127.0.0.1:{server.server_port}/index.html"
        finally:
            server.shutdown()
            thread.join()


def verify_browser(args, url):
    routes = ["network", "service"] if args.route == "all" else [args.route]
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=args.chrome)
        try:
            for route in routes:
                page = browser.new_page(viewport={"width": 1365, "height": 900})
                try:
                    page.set_default_timeout(5000)
                    playthrough(page, url, args.screenshot if route == routes[0] else None, route)
                    print(f"Browser playthrough passed ({route})")
                finally:
                    page.close()
        finally:
            browser.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--chrome", type=Path, default=CHROME)
    parser.add_argument("--screenshot", type=Path)
    parser.add_argument("--url", help="Test a deployed URL instead of starting a local server.")
    parser.add_argument("--route", choices=("all", "network", "service"), default="all")
    args = parser.parse_args()
    if args.url:
        verify_browser(args, args.url)
    else:
        with serve_project() as url:
            verify_browser(args, url)


if __name__ == "__main__":
    main()
