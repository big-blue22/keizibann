const fs = require('fs');

const data = JSON.parse(fs.readFileSync('data/posts.json', 'utf8'));

const newPost = {
  id: 'post_test_' + Date.now(),
  url: 'https://example.com/test',
  title: 'テスト投稿',
  summary: 'これは24時間以内の投稿をテストするための投稿です。緑色のカードで表示されるはずです。',
  labels: ['テスト', '新機能'],
  createdAt: new Date().toISOString(),
  viewCount: 0,
  recentViews: {},
  recentViewCount: 0,
  commentCount: 0
};

data.unshift(newPost);
fs.writeFileSync('data/posts.json', JSON.stringify(data, null, 2));
console.log('テスト投稿を追加しました:', newPost.id);
