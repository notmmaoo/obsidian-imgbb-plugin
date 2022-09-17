import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, requestUrl } from 'obsidian';

import { resolve, relative, join, parse, posix, extname } from "path";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

interface Image {
	path: string;
	name: string;
	source: string;
}

const REGEX_FILE = /\!\[(.*?)\]\((.*?)\)/g;
const REGEX_WIKI_FILE = /\!\[\[(.*?)\]\]/g;

const IMAGE_TYPE = [".png", ".jpg", ".jpeg", ".bmp", ".gif", ".svg", ".tiff"]

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		this.addCommand({
			id: 'upload all images',
			name: 'Upload all images',
			callback: () => {
				this.uploadAllImages();
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
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
			const doc = editor.getDoc();
			const value = doc.getValue();
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

			// return imageList;
			this.uploadImage(imageList);
		}
	}

	async uploadFile(localFile: string, name: string): Promise<any> {
		// post base64 of file
		const file = readFileSync(localFile);
		const base64 = file.toString('base64');
		const form = new FormData();
		form.append('key', this.settings.mySetting);
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
	uploadImage(imageList: Image[]) {
		
		for (const match of imageList) {
			const name = match.name;
			const localFile = match.path;
			this.uploadFile(localFile, name);
		}
	  
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

		new Setting(containerEl)
			.setName('Setting KEY')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
