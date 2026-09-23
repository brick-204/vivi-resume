# Lottie 桌宠动画

每只内置桌宠使用独立目录，JSON 文件名同时保留宠物名和动作名，避免不同桌宠素材混淆：

- `vzai/pet-vzai-*.json`：写字、挥笔、落笔、完稿庆祝、思考、校稿、打盹和拖拽跑跳
- `xiaoyin/pet-xiaoyin-idle.json`
- `xiaoyin/pet-xiaoyin-walk-left.json`
- `xiaoyin/pet-xiaoyin-walk-right.json`
- `xiaoyin/pet-xiaoyin-read.json`
- `xiaoyin/pet-xiaoyin-yawn.json`
- `xiaoyin/pet-xiaoyin-stretch.json`
- `xiaoyin/pet-xiaoyin-jump-up.json`
- `xiaoyin/pet-xiaoyin-jump-down.json`

新增内置桌宠时，在 `src/config/desktopPets.ts` 注册对应的 `lottieAnimationLoaders` 和显示名称。内置动作会在实际触发时才加载；不要覆盖其他桌宠的素材文件。

内置桌宠 JSON 不直接内嵌 Base64 图片。共享 WebP 位于 `public/pets/<桌宠名>/`，动画资产通过相对 `u` 路径加载，兼容网页与 Electron 的 `base: './'` 构建。首次使用先运行 `pip install -r scripts/requirements-pet-assets.txt`，更新原始动画后运行 `python scripts/externalize_pet_assets.py --root .` 重新压缩并按保守阈值合并近似重复帧；传 `--near-dedupe-threshold 0` 可禁用。若本地已有独立包目录，可用 `--package-root PET=PATH` 同步生成自包含 JSON；原始 PNG 帧可用 `--hardlink-frames PATH` 做无损硬链接去重。
