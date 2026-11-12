import argparse
import functools
import re
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import expect, sync_playwright


PROJECT = Path(__file__).resolve().parents[1]
CHROME = Path("C:/Program Files/Google/Chrome/Application/chrome.exe")
SAVE_KEY = "this-computer.save.v1"


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


def playthrough(page, url, screenshot):
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))

    def boot():
        page.locator("#boot").click()
        page.wait_for_function("document.fullscreenElement === document.documentElement")

    def desktop_app(name):
        page.locator(".retro-shortcut").filter(has_text=name).dblclick()

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
    file("handover-current")
    expect(page.locator(".retro-window.is-active textarea")).to_have_value(re.compile("今晚没有未完成的交接"))

    desktop_app("回收站")
    page.locator("[data-restore-id='handover-old']").click()
    page.locator("[data-open-restored='handover-old']").click()
    dismiss_dialog("当前桌面仍有人使用")
    expect(page.locator(".retro-window.is-active textarea")).to_have_value(re.compile("0417"))

    desktop_app("事件查看器")
    page.locator("[data-record-id='0417']").click()
    expect(page.locator(".retro-window.is-active")).to_contain_text("恢复来源：本机缓存")

    desktop_app("网上邻居")
    page.locator("#network-toggle").click()
    dismiss_dialog("正在恢复：你")

    desktop_app("交接记录")
    page.locator("#evidence-record").fill("0417")
    page.locator("#evidence-conclusion").select_option("local-recovery")
    page.locator("#evidence-submit").click()
    result = page.locator("#evidence-result")
    expect(result).to_contain_text("交接记录已封存")

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


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--chrome", type=Path, default=CHROME)
    parser.add_argument("--screenshot", type=Path)
    args = parser.parse_args()
    handler = functools.partial(QuietHandler, directory=PROJECT)
    with ThreadingHTTPServer(("127.0.0.1", 0), handler) as server:
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        url = f"http://127.0.0.1:{server.server_port}/index.html"
        try:
            with sync_playwright() as playwright:
                browser = playwright.chromium.launch(executable_path=args.chrome)
                try:
                    page = browser.new_page(viewport={"width": 1365, "height": 900})
                    page.set_default_timeout(5000)
                    playthrough(page, url, args.screenshot)
                finally:
                    browser.close()
        finally:
            server.shutdown()
            thread.join()
    print("Browser playthrough passed")


if __name__ == "__main__":
    main()
