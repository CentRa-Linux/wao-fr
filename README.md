# Wao フロントエンド

wao.nimバックエンド用の、React + TypeScript + Vite + Tailwind CSS + Shadcn/UIで構築されたモダンなSNSフロントエンド。

## 技術スタック

- **フレームワーク**: React 18
- **言語**: TypeScript
- **ビルドツール**: Vite
- **スタイリング**: Tailwind CSS + Shadcn/UI
- **日付処理**: date-fns

## プロジェクト構成

```
wao-fr/
├── src/
│   ├── components/          # Reactコンポーネント
│   │   ├── ui/             # Shadcn/UI基本コンポーネント
│   │   │   ├── card.tsx
│   │   │   └── avatar.tsx
│   │   └── PostCard.tsx    # 投稿カードコンポーネント
│   ├── hooks/              # カスタムReact Hooks
│   │   └── useSSE.ts       # Server-Sent Events用フック
│   ├── lib/                # ユーティリティとAPIクライアント
│   │   ├── api.ts          # APIクライアント
│   │   └── utils.ts        # ユーティリティ関数
│   ├── types.ts            # TypeScript型定義
│   ├── index.css           # グローバルスタイル
│   └── App.tsx             # メインアプリコンポーネント
├── tailwind.config.js      # Tailwind CSS設定
├── components.json         # Shadcn/UI設定
└── vite.config.ts          # Vite設定
```

## 主な機能

### 型定義 (`src/types.ts`)
- `User`: ユーザー情報
- `Post`: 投稿データ
- `Media`: メディア（画像・動画）情報
- `Notification`: 通知データ
- `AuthResponse`: 認証レスポンス

### APIクライアント (`src/lib/api.ts`)
バックエンドとの通信を簡単に行うためのクライアント。自動的にJWTトークンをヘッダーに付与します。

主なメソッド：
- **認証**: `signIn()`, `signUp()`, `refreshToken()`
- **ユーザー**: `getMe()`, `getUser()`, `followUser()`, `unfollowUser()`
- **投稿**: `getTimeline()`, `createPost()`, `reactPost()`, `repostPost()`
- **通知**: `getNotifications()`, `markNotificationAsRead()`
- **メディア**: `uploadMedia()`

### SSEフック (`src/hooks/useSSE.ts`)
リアルタイム更新のためのServer-Sent Eventsフック。

```typescript
useSSE({
  onTimelineUpdate: (post) => {
    // 新しい投稿を受信
  },
  onNotification: (notification) => {
    // 新しい通知を受信
  },
  enabled: true
});
```

### PostCardコンポーネント (`src/components/PostCard.tsx`)
投稿を表示するカードコンポーネント。以下の機能を含みます：
- ユーザー情報表示
- 投稿内容表示
- メディア（画像・動画）表示
- リアクション、リポスト、リプライボタン

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example`をコピーして`.env`を作成：

```bash
cp .env.example .env
```

必要に応じて、バックエンドのURLを変更してください。

### 3. 開発サーバーの起動

```bash
npm run dev
```

デフォルトで http://localhost:5173 で起動します。

### 4. ビルド

```bash
npm run build
```

ビルド成果物は`dist/`ディレクトリに生成されます。

## 使用例

### APIの使用

```typescript
import { api } from '@/lib/api';

// ログイン
const { accessToken, refreshToken } = await api.signIn({
  uniqueid: 'username',
  password: 'password'
});

// トークンを保存
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);

// タイムラインを取得
const posts = await api.getTimeline({ limit: 20 });

// 投稿を作成
const newPost = await api.createPost('Hello, World!');
```

### コンポーネントの使用

```tsx
import { PostCard } from '@/components/PostCard';

function Timeline() {
  const handleReact = (postId: number) => {
    // リアクション処理
  };

  return (
    <div>
      {posts.map(post => (
        <PostCard
          key={post.id}
          post={post}
          onReact={handleReact}
        />
      ))}
    </div>
  );
}
```

## 開発のヒント

- **型安全性**: TypeScriptの型定義を活用して、バグを事前に防ぎましょう
- **パスエイリアス**: `@/`から始まるインポートで`src/`を参照できます
- **Tailwind CSS**: ユーティリティクラスを活用して素早くスタイリング
- **Shadcn/UI**: 必要に応じて追加のコンポーネントを`npx shadcn@latest add [component]`でインストール可能

## ライセンス

このプロジェクトのライセンスは、wao.nimバックエンドプロジェクトに準じます。
