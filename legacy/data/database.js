// Mock Database storing titles, episodes, server mappings, and stream sources
module.exports = {
  catalog: [
    {
      id: "overgeared-102",
      title: "Overgeared: The Legendary Blacksmith",
      japaneseTitle: "装備の覇者",
      genre: ["Action", "Fantasy", "VRMMO", "Adventure"],
      rating: "8.8",
      status: "Airing",
      banner: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&q=80",
      thumbnail: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80",
      description: "Grid, the unluckiest virtual reality player in Satisfy, accidentally discovers the Pagma's Rare Book and class-changes into a legendary blacksmith, turning the world hierarchy upside down.",
      totalEpisodes: 4,
    },
    {
      id: "cyber-pulse-2099",
      title: "Cyber Pulse: Neon Protocol",
      japaneseTitle: "サイバーパルス",
      genre: ["Sci-Fi", "Cyberpunk", "Psychological"],
      rating: "9.1",
      status: "Completed",
      banner: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&q=80",
      thumbnail: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&q=80",
      description: "In the rain-soaked megacity of Neo-Yokohama, a rogue netrunner uncovers an AI collective that manipulates citizen neural implants.",
      totalEpisodes: 3,
    },
    {
      id: "abyssal-vanguard",
      title: "Abyssal Vanguard: Gatekeepers",
      japaneseTitle: "深淵の先鋒",
      genre: ["Supernatural", "Mystery", "Dark Fantasy"],
      rating: "8.5",
      status: "Airing",
      banner: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&q=80",
      thumbnail: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80",
      description: "When dimensional rifts appear across the continent, elite squads venture into the unknown depths to secure reality anchors.",
      totalEpisodes: 3,
    }
  ],

  episodes: {
    "overgeared-102": [
      { number: 1, id: "ep-102-1", title: "Episode 1: The Ashur's Quest", duration: "24m", thumbnail: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&q=80" },
      { number: 2, id: "ep-102-2", title: "Episode 2: Pagma's Successor", duration: "23m", thumbnail: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&q=80" },
      { number: 3, id: "ep-102-3", title: "Episode 3: The Northern Frost Cave", duration: "25m", thumbnail: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&q=80" },
      { number: 4, id: "ep-102-4", title: "Episode 4: Rebuilding the Dagger", duration: "24m", thumbnail: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&q=80" }
    ],
    "cyber-pulse-2099": [
      { number: 1, id: "ep-2099-1", title: "Episode 1: Ghost in the Protocol", duration: "25m", thumbnail: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&q=80" },
      { number: 2, id: "ep-2099-2", title: "Episode 2: Chrome & Concrete", duration: "24m", thumbnail: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&q=80" },
      { number: 3, id: "ep-2099-3", title: "Episode 3: Overdrive Sync", duration: "26m", thumbnail: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&q=80" }
    ],
    "abyssal-vanguard": [
      { number: 1, id: "ep-abyss-1", title: "Episode 1: Fracture Point", duration: "24m", thumbnail: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&q=80" },
      { number: 2, id: "ep-abyss-2", title: "Episode 2: Shadow Leyline", duration: "23m", thumbnail: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&q=80" },
      { number: 3, id: "ep-abyss-3", title: "Episode 3: The Anchor Holds", duration: "25m", thumbnail: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&q=80" }
    ]
  },

  // Approved playback sources available per episode (Step 2 of the spec).
  // These streams are public test assets only; replace them with media for
  // which you have obtained distribution and playback rights.
  servers: {
    "ep-102-1": {
      sub: [
        { serverId: "licensed-demo-sub", serverName: "Approved Demo HLS", quality: "Multi-bitrate test stream", latency: "Direct" }
      ],
      dub: [
        { serverId: "licensed-demo-dub", serverName: "Approved Demo HLS", quality: "Multi-bitrate test stream", latency: "Direct" }
      ]
    },
    "ep-102-2": {
      sub: [
        { serverId: "licensed-demo-sub", serverName: "Approved Demo HLS", quality: "Multi-bitrate test stream", latency: "Direct" }
      ],
      dub: [
        { serverId: "licensed-demo-dub", serverName: "Approved Demo HLS", quality: "Multi-bitrate test stream", latency: "Direct" }
      ]
    },
    "default": {
      sub: [
        { serverId: "licensed-demo-sub", serverName: "Approved Demo HLS", quality: "Multi-bitrate test stream", latency: "Direct" }
      ],
      dub: [
        { serverId: "licensed-demo-dub", serverName: "Approved Demo HLS", quality: "Multi-bitrate test stream", latency: "Direct" }
      ]
    }
  },

  // Sources resolved for each serverId (Step 3 of the spec)
  sources: {
    "licensed-demo-sub": {
      type: "hls",
      serverName: "Approved Demo HLS",
      audioMode: "sub",
      link: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      requiresProxy: false,
      tracks: [
        { kind: "subtitles", label: "English", file: "https://dash.akamaized.net/akamai/test/caption.vtt", default: true },
        { kind: "subtitles", label: "Spanish", file: "https://dash.akamaized.net/akamai/test/caption.vtt" }
      ],
      headers: {}
    },
    "licensed-demo-dub": {
      type: "hls",
      serverName: "Approved Demo HLS",
      audioMode: "dub",
      link: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      requiresProxy: false,
      tracks: [
        { kind: "subtitles", label: "Closed Captions (CC)", file: "https://dash.akamaized.net/akamai/test/caption.vtt", default: true }
      ],
      headers: {}
    }
  }
};
