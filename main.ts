import { App, MarkdownView, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

import { parse, extname } from "path";
import { existsSync, readFileSync } from "fs";
// Remember to rename these classes and interfaces!

interface ImgbbPluginSettings {
	ImgbbKeySetting: string;
}

const DEFAULT_SETTINGS: ImgbbPluginSettings = {
	ImgbbKeySetting: 'default'
}

interface Image {
	path: string;
	name: string;
	source: string;
}

const REGEX_FILE = /\!\[(.*?)\]\((.*?)\)/g;
const REGEX_WIKI_FILE = /\!\[\[(.*?)\]\]/g;

const IMAGE_TYPE = [".png", ".jpg", ".jpeg", ".bmp", ".gif", ".svg", ".tiff"]

export default class ImgbbPlugin extends Plugin {
	settings: ImgbbPluginSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Imgbb Plugin', (evt: MouseEvent) => {
			this.uploadAllImages();
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('imgbb-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		this.addCommand({
			id: 'upload all images',
			name: 'Upload all images',
			callback: () => {
				this.uploadAllImages();
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	uploadAllImages() {
		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (markdownView) {
			const editor = markdownView.editor;
			let value = editor.getValue();
			const matches = value.matchAll(REGEX_FILE);
			const WikiMatches = value.matchAll(REGEX_WIKI_FILE);

			let imageList: Image[] = [];

			for (const match of matches) {
				const name = match[1];
				const path = match[2].toLowerCase();
				const source = match[0];

				let ext = extname(path)
				if (path.startsWith('http') || !IMAGE_TYPE.includes(ext)) {
					continue
				}
				if (existsSync(path)) {
					imageList.push({
						path: path,
						name: name,
						source: source,
					});
				}
			}

			for (const match of WikiMatches) {
				const name = parse(match[1]).name;
				const path = match[1].toLowerCase();;
				const source = match[0];

				let ext = extname(path)
				if (path.startsWith('http') || !IMAGE_TYPE.includes(ext)) {
					continue
				}
				if (existsSync(path)) {
					imageList.push({
						path: path,
						name: name,
						source: source,
					});
				}
			}

			console.log(imageList);
			if (imageList.length === 0) {
				new Notice("没有解析到图像文件");
				return;
			} else {
				new Notice(`共找到${imageList.length}个图像文件，开始上传`);
			}

			// upload imageList;
			for (const match of imageList) {
				const name = match.name;
				const localFile = match.path;
				this.uploadFile(localFile, name).then(res => {
					if (res.success) {
						let uploadUrlList = res.data.display_url;
						value = value.replace(match.source, `![${name}](${uploadUrlList})`);
						new Notice(uploadUrlList);
					} else {
						new Notice("Upload error");
					}
				}).then(() => {
					console.log("update editor");
					editor.setValue(value);
				});
			}
		}
	}

	async uploadFile(localFile: string, name: string): Promise<any> {
		// post base64 of file
		const file = readFileSync(localFile);
		const base64 = file.toString('base64');
		const form = new FormData();
		form.append('key', this.settings.ImgbbKeySetting);
		form.append('name', name);
		form.append('image', base64);

		const response = await fetch('https://api.imgbb.com/1/upload', {
			method: "POST",
			body: form,
		});

		const data = response.json();
		console.log(data)
		return data;
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: ImgbbPlugin;

	constructor(app: App, plugin: ImgbbPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Settings for imgbb plugin.' });

		new Setting(containerEl)
			.setName('Setting Imgbb API KEY, register at https://api.imgbb.com/')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.ImgbbKeySetting)
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.ImgbbKeySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
