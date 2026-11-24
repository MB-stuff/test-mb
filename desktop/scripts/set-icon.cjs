// Вшивает иконку и сведения о программе в «Grand Simulacre.exe» без Wine (чистый JS, библиотека resedit).
// Вызывается electron-builder после упаковки (afterPack), до того как exe будет завёрнут в переносной файл.
const fs = require('fs');
const path = require('path');
const ResEdit = require('resedit');

exports.default = async function afterPack(ctx) {
  if (ctx.electronPlatformName !== 'win32') return;
  const exe = path.join(ctx.appOutDir, ctx.packager.appInfo.productFilename + '.exe');
  const data = fs.readFileSync(exe);
  const pe = ResEdit.NtExecutable.from(data, { ignoreCert: true });
  const res = ResEdit.NtExecutableResource.from(pe);

  const ico = ResEdit.Data.IconFile.from(fs.readFileSync(path.join(__dirname, '..', 'build', 'icon.ico')));
  const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
  const lang = groups.length ? groups[0].lang : 1033;
  const id = groups.length ? groups[0].id : 1;
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, id, lang, ico.icons.map(i => i.data));

  const vi = ResEdit.Resource.VersionInfo.fromEntries(res.entries)[0];
  if (vi) {
    const ver = ctx.packager.appInfo.version.split('.').map(Number);
    vi.setFileVersion(ver[0], ver[1], ver[2], 0, lang);
    vi.setProductVersion(ver[0], ver[1], ver[2], 0, lang);
    vi.setStringValues({ lang, codepage: 1200 }, {
      FileDescription: 'Grand Simulacre',
      ProductName: 'Grand Simulacre',
      OriginalFilename: 'Grand Simulacre.exe',
      InternalName: 'Grand Simulacre',
      CompanyName: 'Grand Simulacre',
      LegalCopyright: '',
    });
    vi.outputToResourceEntries(res.entries);
  }
  res.outputResource(pe);
  fs.writeFileSync(exe, Buffer.from(pe.generate()));
  console.log('  • иконка и сведения вшиты в', path.basename(exe));
};
