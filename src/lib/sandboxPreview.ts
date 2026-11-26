/**
 * src/lib/sandboxPreview.ts
 * Assembles an isolated HTML document for previewing student-edited HTML/CSS/JS
 * inside a sandboxed iframe (sandbox="allow-scripts allow-forms") without exposing parent memory.
 */

export function buildSandboxedPreviewHtml(
  targetPath: string,
  editedCode: string,
  repoFiles: Record<string, string>,
  demoRole: 'Admin' | 'Clerk' | 'Doctor' | 'Patient'
): string {
  const roleSessionMap: Record<string, object> = {
    Admin: { loginName: 'admin01', role: 'Admin', refId: 'ADM-101', fullName: 'System Administrator' },
    Clerk: { loginName: 'clerk01', role: 'Clerk', refId: 'CLK-101', fullName: 'Ramesh Iyer' },
    Doctor: { loginName: 'doc01', role: 'Doctor', refId: 'DOC-101', fullName: 'Dr. Arjun Nair' },
    Patient: { loginName: 'pat01', role: 'Patient', refId: 'PAT-101', fullName: 'Ananya Sharma' },
  };

  const mergedFiles = { ...repoFiles, [targetPath]: editedCode };
  const folder = targetPath.split('/')[0];

  const storageShim = `
    <script>
      (function () {
        var memLocal = {};
        var memSession = {
          pt_logged_in_user: ${JSON.stringify(JSON.stringify(roleSessionMap[demoRole]))}
        };
        function makeStore(backing) {
          return {
            getItem: function (k) { return Object.prototype.hasOwnProperty.call(backing, k) ? backing[k] : null; },
            setItem: function (k, v) { backing[k] = String(v); },
            removeItem: function (k) { delete backing[k]; },
            clear: function () { Object.keys(backing).forEach(function (k) { delete backing[k]; }); }
          };
        }
        try {
          Object.defineProperty(window, 'localStorage', { value: makeStore(memLocal), configurable: true });
          Object.defineProperty(window, 'sessionStorage', { value: makeStore(memSession), configurable: true });
        } catch (e) {}
      })();
    </script>
  `;

  function resolveRelativePath(rel: string): string {
    if (rel.startsWith('../')) {
      return rel.replace(/^\.\.\//, '');
    }
    return `${folder}/${rel}`;
  }

  // If the student is editing a CSS file, preview a showcase sample page in that module
  let htmlSource = editedCode;
  if (targetPath.endsWith('.css')) {
    const sampleHtmlPath =
      folder === 'doctor'
        ? 'doctor/consultation.html'
        : folder === 'patient'
          ? 'patient/history.html'
          : 'login/admin-home.html';
    htmlSource = mergedFiles[sampleHtmlPath] || '<!doctype html><html><body><p>CSS preview ready.</p></body></html>';
  } else if (targetPath.endsWith('.js')) {
    // Pick a host HTML page that loads this JS file
    const matchingHtml = Object.keys(mergedFiles).find(
      (k) => k.endsWith('.html') && (mergedFiles[k].includes(targetPath.split('/')[1]) || mergedFiles[k].includes(targetPath))
    );
    htmlSource =
      (matchingHtml && mergedFiles[matchingHtml]) ||
      `<!doctype html><html><head><link rel="stylesheet" href="login.css"></head><body><div class="pt-container"><div id="navbarRoot"></div><div id="alertBox" class="pt-alert" style="display:none;"></div><section class="pt-card"><h2>JS Module Preview: ${targetPath}</h2><p style="color:#64748b;">Loaded ${targetPath} in sandboxed runtime.</p></section></div><script src="../shared/storage.js"></script><script src="${targetPath.split('/')[1]}"></script></body></html>`;
  }

  // Inline local CSS <link rel="stylesheet" href="...">
  let inlined = htmlSource.replace(
    /<link\s+rel=["']stylesheet["']\s+href=["']([^"']+)["']\s*\/?>/gi,
    (_full, href: string) => {
      if (href.startsWith('http')) return '';
      const resolved = resolveRelativePath(href);
      let cssText = mergedFiles[resolved] || '';
      // Also resolve @import url('../login/login.css')
      cssText = cssText.replace(/@import\s+url\(['"]?([^'")]+)['"]?\);?/gi, (_m, imp: string) => {
        const impPath = resolveRelativePath(imp);
        return mergedFiles[impPath] || '';
      });
      return `<style>\n${cssText}\n</style>`;
    }
  );

  // Inline local <script src="..."></script>
  inlined = inlined.replace(
    /<script\s+src=["']([^"']+)["']\s*><\/script>/gi,
    (_full, src: string) => {
      if (src.startsWith('http')) return '';
      const resolved = resolveRelativePath(src);
      const jsText = mergedFiles[resolved] || '';
      return `<script>\n${jsText}\n</script>`;
    }
  );

  // Inject storage shim at the very start of <head> (or document)
  if (/<head[^>]*>/i.test(inlined)) {
    inlined = inlined.replace(/<head[^>]*>/i, (match) => `${match}\n${storageShim}`);
  } else {
    inlined = `${storageShim}\n${inlined}`;
  }

  return inlined;
}
