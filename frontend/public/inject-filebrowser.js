(function() {
    // Wait for React to mount
    let attempts = 0;
    function waitForApp() {
        const appRoot = document.getElementById('root');
        if (appRoot && appRoot.children.length > 0) {
            console.log('[FileBrowser] App detected, injecting...');
            injectButtonAndModal();
        } else if (attempts < 50) {
            attempts++;
            setTimeout(waitForApp, 200);
        } else {
            console.error('[FileBrowser] Could not find app root after 10 seconds');
        }
    }

    function injectButtonAndModal() {
        // Create floating button
        const btn = document.createElement('button');
        btn.innerHTML = '📁';
        btn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: #1D4ED8;
            color: white;
            border: none;
            font-size: 24px;
            cursor: pointer;
            z-index: 9999;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        `;
        btn.onclick = () => openFileBrowser();
        document.body.appendChild(btn);

        // Create modal (hidden initially)
        const modal = document.createElement('div');
        modal.id = 'vibecoder-filebrowser-modal';
        modal.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.85);
            z-index: 10000;
            display: none;
            align-items: center;
            justify-content: center;
        `;
        modal.innerHTML = `
            <div style="width:80%; height:80%; background:#0C0B10; border-radius:12px; display:flex; flex-direction:column; overflow:hidden; border:1px solid rgba(255,255,255,0.1)">
                <div style="padding:8px 12px; background:#1E293B; display:flex; justify-content:space-between; align-items:center">
                    <span style="color:white; font-weight:600">📂 System File Browser</span>
                    <button id="close-modal-btn" style="background:none; border:none; color:white; font-size:20px; cursor:pointer">✕</button>
                </div>
                <div id="vibecoder-filebrowser-container" style="flex:1;"></div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('close-modal-btn').onclick = () => {
            modal.style.display = 'none';
        };

        window.openFileBrowser = function openFileBrowser() {
            modal.style.display = 'flex';
            // Load FileBrowser React component dynamically
            const container = document.getElementById('vibecoder-filebrowser-container');
            if (!container.hasChildNodes()) {
                import('/src/components/FileBrowser.jsx').catch(err => {
                    console.error('Failed to load FileBrowser', err);
                    container.innerHTML = '<div style="color:red; padding:20px">Error loading FileBrowser. Make sure the component exists.</div>';
                });
            }
        };
    }

    waitForApp();
})();
