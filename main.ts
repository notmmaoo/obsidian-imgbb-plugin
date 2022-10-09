import { App, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, FileSystemAdapter, requestUrl, TFile } from 'obsidian';

interface ImgbbPluginSettings {
	ImgbbKeySetting: string;
}

const DEFAULT_SETTINGS: ImgbbPluginSettings = {
	ImgbbKeySetting: 'default'
}

interface UploadImage {
	path: TFile;
	name: string;
	source: string;
}

interface localImage {
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

		// This creates an icon in the left ribbon. ref: https://lucide.dev/
		const ribbonIconEl = this.addRibbonIcon('upload-cloud', 'Imgbb Plugin', (evt: MouseEvent) => {
			this.uploadAllImages();
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('imgbb-plugin-ribbon-class');

		this.addCommand({
			id: 'upload all images',
			name: 'Upload all images',
			// ref: https://marcus.se.net/obsidian-plugin-docs/user-interface/commands#editor-commands
			editorCallback: () => {
				this.uploadAllImages();
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new ImgbbSettingTab(this.app, this));
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
			let uploadImageList: UploadImage[] = [];
			let localImageList: localImage[] = [];
			const files = this.app.vault.getFiles();

			for (const match of matches) {
				const name = match[1];
				const path = match[2].toLowerCase();
				const source = match[0];
				localImageList.push({ path, name, source });
			}
			
			for (const match of WikiMatches) {
				const name = match[1];
				const path = match[1].toLowerCase();;
				const source = match[0];
				localImageList.push({ path, name, source });
			}
			
			for (const { path, name, source } of localImageList) {
				if (path.startsWith('http')) {
					continue
				}
				for (let i = 0; i < IMAGE_TYPE.length; i++) {
					if (path.endsWith(IMAGE_TYPE[i])) {
						break;
					}
				}
				for (let i = 0; i < files.length; i++) {
					if (files[i].path.toLowerCase().endsWith(path)) {
						uploadImageList.push({
							path: files[i],
							name: name,
							source: source
						})
						break;
					}
				}
			}

			if (uploadImageList.length === 0) {
				new Notice("没有解析到图像文件");
				return;
			} else {
				new Notice(`共找到${uploadImageList.length}个图像文件，开始上传`);
			}

			// upload imageList;
			for (const match of uploadImageList) {
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
					editor.setValue(value);
				});
			}
		}
	}

	async uploadFile(localFile: TFile, name: string): Promise<any> {
		// post base64 of file
		const file = await this.app.vault.readBinary(localFile);
		const base64 = Buffer.from(file).toString('base64');
		const body = {
			"key": this.settings.ImgbbKeySetting,
			"image": base64,
			"name": name,
		}
		const response = await requestUrl({
			url: 'https://api.imgbb.com/1/upload',
			method: "POST",
			contentType: "application/x-www-form-urlencoded",
			body: new URLSearchParams(body).toString(),
		});

		const data = await response.json;
		return data;
	}
}

class ImgbbSettingTab extends PluginSettingTab {
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
