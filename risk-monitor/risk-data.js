/* Extracted from demo.html — Risk Monitor category model. */
    window.RISK_CATEGORIES = [
      {
        id: 'system', title: 'System & Performance', icon: 'fa-gauge-high',
        color: 'var(--ill-blue)', tint: 'var(--ill-tint-blue)', text: '#FFFFFF',
        points: [
          'Makes your computer slower',
          'Can use up all CPU or memory',
          'Can drain the battery or heat up the machine',
          'May start extra background apps at startup',
          'Automatic backups can fill up your disk'
        ],
        summary: "AI may run tasks in the background, slowing your computer down or draining the battery faster.",
        overallRisk: 'Medium',
        dims: { read: 'low', change: 'med', execute: 'med', egress: 'low', persist: 'low' },
        ops: ['Read your files', 'Change settings', 'Run scripts', 'Send data', 'Keep running'],
        keyStats: [
          "Runs only while you watch",
          "Can be stopped anytime",
          "No permanent changes"
        ],
        riskRows: [
          { name: "CPU & memory strain", desc: "Heavy builds can freeze your computer for minutes.", level: 'med', dim: 'execute', icon: 'fa-microchip' },
          { name: "Background processes", desc: "Scripts may keep running after the task ends.", level: 'low', dim: 'persist', icon: 'fa-clock' },
          { name: "Temp & cache files", desc: "Extra files may be written to your disk.", level: 'low', dim: 'change', icon: 'fa-hard-drive' }
        ],
        notes: [
          "Performance impacts are usually reversible, but they can interrupt your workflow.",
          "Do not auto-approve high-usage tasks by default.",
          "You can always end an AI process in Task Manager."
        ],
        defaultSetting: 'ask',
        interactions: [
          { on: "Sluggish / slower", action: "Tip: set AI tasks to run only while the computer is idle." },
          { on: "Unreliable output", action: "Show Retry / Rollback options." }
        ]
      },
      {
        id: 'files', title: 'Files & Data', icon: 'fa-folder-open',
        color: 'var(--ill-amber)', tint: 'var(--ill-tint-amber)', text: '#1A1404',
        points: [
          'Files can be changed, overwritten or deleted',
          'Files can be moved or renamed',
          'File permissions can be changed'
        ],
        summary: "AI may modify, move, upload, or delete your files without asking first.",
        overallRisk: 'High',
        dims: { read: 'med', change: 'high', execute: 'low', egress: 'low', persist: 'low' },
        ops: ['Read your files', 'Edit project files', 'Run commands', 'Send data', 'Keep changes'],
        keyStats: [
          "Backup copy before edits",
          "Undo available",
          "Stays inside your project"
        ],
        riskRows: [
          { name: "Project files changed", desc: "Your code can be edited or deleted — a backup is kept first.", level: 'high', dim: 'change', icon: 'fa-file-pen' },
          { name: "Sensitive files", desc: "Configs and credentials near your project may be read.", level: 'med', dim: 'read', icon: 'fa-file-shield' },
          { name: "Change history", desc: "Edits are recorded so you can undo them.", level: 'low', dim: 'persist', icon: 'fa-clock-rotate-left' }
        ],
        notes: [
          "Deletion and overwrites can be irreversible — require a second confirmation.",
          "Before uploading to the cloud, show the destination and the privacy policy.",
          "Permission changes must show the public / private status clearly."
        ],
        defaultSetting: 'ask',
        interactions: [
          { on: "Auto-deletion", action: "Show 'This cannot be undone. Continue?' confirmation." },
          { on: "Data leakage", action: "Show the upload destination domain and file list." }
        ]
      },
      {
        id: 'privacy', title: 'Privacy & Info', icon: 'fa-user-shield',
        color: 'var(--ill-violet)', tint: 'var(--ill-tint-violet)', text: '#FFFFFF',
        points: [
          'Photos, chats and mail can be read',
          'Browsing and search history can be collected',
          'Passwords and keys can be accessed',
          'Location or clipboard can be captured',
          'Sensitive files can be leaked or sent out'
        ],
        summary: "AI may read your photos, chats, passwords, and location.",
        overallRisk: 'High',
        dims: { read: 'high', change: 'low', execute: 'low', egress: 'med', persist: 'low' },
        ops: ['Read personal data', 'Change your files', 'Run anything', 'Send data out', 'Keep access'],
        keyStats: [
          "Never sells your data",
          "You can revoke access anytime",
          "Explained in plain words"
        ],
        riskRows: [
          { name: "Personal files read", desc: "Documents, photos and chats can be opened.", level: 'high', dim: 'read', icon: 'fa-image' },
          { name: "Account & browsing data", desc: "Saved logins and history may be visible to the AI.", level: 'med', dim: 'read', icon: 'fa-key' },
          { name: "Data sent out", desc: "Some info may be sent to AI servers to process it.", level: 'med', dim: 'egress', icon: 'fa-paper-plane' }
        ],
        notes: [
          "Privacy reads must be authorized item by item — no one-click allow-all.",
          "Passwords, keys and other sensitive items default to Block.",
          "Location access must state its duration and purpose."
        ],
        defaultSetting: 'block',
        interactions: [
          { on: "Passwords / keys accessed", action: "Show a 'Block recommended' label." }
        ]
      },
      {
        id: 'software', title: 'Software & Settings', icon: 'fa-puzzle-piece',
        color: 'var(--ill-coral)', tint: 'var(--ill-tint-coral)', text: '#FFFFFF',
        points: [
          'Apps can be installed or removed',
          'Browser extensions can be added',
          'System settings can be changed',
          'Permissions can be changed',
          'Apps can update or restart on their own'
        ],
        summary: "AI may install or uninstall software, or change system settings.",
        overallRisk: 'Medium',
        dims: { read: 'low', change: 'high', execute: 'high', egress: 'med', persist: 'low' },
        ops: ['Read your files', 'Install software', 'Run scripts', 'Download packages', 'Stay installed'],
        keyStats: [
          "Asks before installing",
          "Sandboxed where possible",
          "You see what's installed"
        ],
        riskRows: [
          { name: "Software installed", desc: "New apps and packages can be added to your machine.", level: 'high', dim: 'change', icon: 'fa-download' },
          { name: "Scripts executed", desc: "Code can run on your computer with your permission.", level: 'high', dim: 'execute', icon: 'fa-terminal' },
          { name: "Downloads", desc: "Packages are fetched from the internet.", level: 'med', dim: 'egress', icon: 'fa-puzzle-piece' }
        ],
        notes: [
          "Before installing plugins, show their source and permissions.",
          "System setting changes need a 'Restore defaults' option.",
          "Before uninstalling software, confirm it will not affect other programs."
        ],
        defaultSetting: 'ask',
        interactions: [
          { on: "Auto-install", action: "Show the plugin source and rating." },
          { on: "System settings changes", action: "Offer an 'Undo changes' button." }
        ]
      },
      {
        id: 'money', title: 'Money & Communication', icon: 'fa-money-bill-wave',
        color: 'var(--ill-teal)', tint: 'var(--ill-tint-teal)', text: '#FFFFFF',
        points: [
          'Purchases, payments or transfers can happen',
          'Subscriptions can renew or payment details change',
          'Messages and emails can be sent automatically',
          'Posts and comments can be published',
          'Your profile can be changed'
        ],
        summary: "AI may spend money, send messages, or post on your behalf.",
        overallRisk: 'High',
        dims: { read: 'med', change: 'high', execute: 'low', egress: 'high', persist: 'med' },
        ops: ['Read accounts', 'Charge money', 'Run scripts', 'Send messages', 'Keep access'],
        keyStats: [
          "Never auto-approved",
          "Every charge is shown",
          "Instant cancel"
        ],
        riskRows: [
          { name: "Payments", desc: "Real money can be charged to your accounts.", level: 'high', dim: 'change', icon: 'fa-credit-card' },
          { name: "Messages sent", desc: "Emails and messages can go out in your name.", level: 'high', dim: 'egress', icon: 'fa-envelope' },
          { name: "Linked accounts", desc: "Payment and communication accounts can be accessed.", level: 'med', dim: 'read', icon: 'fa-link' }
        ],
        notes: [
          "Any payment or transfer defaults to Block and needs manual confirmation.",
          "Before sending messages, show the recipient and a content preview.",
          "Subscription renewals need a 24-hour notice."
        ],
        defaultSetting: 'block',
        interactions: [
          { on: "Auto-payment", action: "Payment confirmation requires a password or biometrics." },
          { on: "Auto-sent messages", action: "Show a draft preview with a Cancel button." }
        ]
      },
      {
        id: 'irreversible', title: 'Irreversible & Trust', icon: 'fa-skull-crossbones',
        color: 'var(--ill-coral)', tint: 'var(--ill-tint-coral)', text: '#FFFFFF',
        points: [
          'Files can be deleted permanently or a disk formatted',
          'Large money transfers cannot be taken back',
          'There is no undo button',
          'No record is kept of what the AI did'
        ],
        summary: "Some AI actions cannot be undone, and you may not know what happened.",
        overallRisk: 'High',
        dims: { read: 'med', change: 'high', execute: 'med', egress: 'low', persist: 'high' },
        ops: ['Read your files', 'Delete things', 'Run commands', 'Send data', 'Stay changed'],
        keyStats: [
          "Always asks first",
          "Locked to Ask",
          "Warning before acting"
        ],
        riskRows: [
          { name: "Permanent deletions", desc: "Deleted things usually cannot be brought back.", level: 'high', dim: 'change', icon: 'fa-trash' },
          { name: "Long-lasting changes", desc: "Settings and systems stay changed after the task.", level: 'high', dim: 'persist', icon: 'fa-rotate-left' },
          { name: "No undo", desc: "Mistakes here can't be fixed with one click.", level: 'med', dim: 'change', icon: 'fa-ban' }
        ],
        notes: [
          "Irreversible actions need a second confirmation and a clear consequence warning.",
          "Automatically generate a log of every action — viewable and exportable.",
          "Provide an Undo button where possible; state clearly when it is not."
        ],
        defaultSetting: 'ask',
        interactions: [
          { on: "Permanent deletion", action: "Red warning requiring the user to type DELETE." },
          { on: "No activity log", action: "Open a log panel showing time, action and result." }
        ]
      }
    ];
