// api/delete-post.mjs の修正箇所
const allPosts = await kv.lrange('posts', 0, -1);

const postsToKeep = allPosts.filter(p => {
    try {
        return JSON.parse(p).id !== postId;
    } catch (e) {
        // パースできないデータは保持する（あるいはエラーとして扱う）
        console.error("Could not parse post, keeping it:", p);
        return true;
    }
});
