![Rock Markdown Editor](/src/logo.png)

# Rock! Markdown Editor
Cross-platform Markdown Editor.

## Features

- WYSIWYG, Ctrl+F12 quick browser preview.
- Completely import and export.
- Support drag and drop, support `.Markdown` `.md` `.txt` formats.
- Support export to HTML file.
- Support send email with converted HTML.
- Support multi-tab and rich keyboard shortcuts.
- Friendly state holding, Automatic remember editor status of the last time.
- Completely history file records.

## ScreenShot

![Rock Markdown Editor](/docs/macshow.png)

## Downloads

Latest: **v0.2.0** [changeLog](#changelog)

- Mac 10.7+: [32bit](https://www.dropbox.com/s/e9f1x258qi193es/Rock_Markdown_v0.2.0_osx32.zip?dl=0) / [64bit](https://www.dropbox.com/s/i0x1slhovyq3o0b/Rock_Markdown_v0.2.0_osx64.zip?dl=0)
- Windows: [32bit](https://www.dropbox.com/s/m5237obl3qgl3qy/Rock_Markdown_v0.2.0_win32.zip?dl=0) / [64bit](https://www.dropbox.com/s/5qon41y051ofjl2/Rock_Markdown_v0.2.0_win64.zip?dl=0)
- Linux: [32bit](https://www.dropbox.com/s/u7zoyg3mkm2oq2i/Rock_Markdown_v0.2.0_linux32.zip?dl=0) / [64bit](https://www.dropbox.com/s/otwpvfi4ycs5oj4/Rock_Markdown_v0.2.0_linux64.zip?dl=0)

The above is hosted on Dropbox, you may need proxy software (In China, u know, the GFW).
Or you may try to clone this repository and [compile](http://strongloop.com/strongblog/creating-desktop-applications-with-node-webkit/) to binary file.

## Thanks to the following projects

- [Node-webkit](https://github.com/rogerwang/node-webkit)
- [Node.js](http://nodejs.org/)
- [CodeMirror](http://codemirror.net)
- [Showdown](https://github.com/coreyti/showdown)

## ChangeLog

### 0.2.0 (2015.10.26)
- Better support for mac.
- Rearrange file directory structure.
- Remove directory node_modules.

### 0.1.3 (2014.01.13)
- `Fix` prompt to save but actually not saved when exit.
- Improve history email contacts.
- Add 'Manual-overload' as file was edit elsewhere.
- Improve start-up speed.

# License
Released under the MIT license.

MIT: [http://rem.mit-license.org](http://rem.mit-license.org/), See [LICENSE](/LICENSE)
