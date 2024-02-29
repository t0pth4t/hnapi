import * as admin from "firebase-admin";
admin.initializeApp({
    databaseURL: "https://hacker-news.firebaseio.com",
});
const db = admin.firestore();
async function fetchComments(itemId) {
    const itemRef = db.collection("items").doc(itemId);
    const itemDoc = await itemRef.get();
    if (!itemDoc?.exists) {
        console.error(`Item with ID ${itemId} not found.`);
        return;
    }
    const comments = await fetchCommentsRecursive(itemDoc.data()?.kids ?? []);
    console.log(comments);
}
async function fetchCommentsRecursive(commentIds) {
    const commentPromises = commentIds.map(async (commentId) => {
        const commentRef = db.collection("items").doc(commentId);
        const commentDoc = await commentRef.get();
        if (!commentDoc.exists) {
            return {
                id: commentDoc.id,
            }; // Skip deleted or non-existent comments
        }
        const commentData = commentDoc.data();
        return {
            id: commentDoc.id,
            text: commentData?.text,
            author: commentData?.by,
            children: commentData?.kids
                ? await fetchCommentsRecursive(commentData.kids)
                : [],
        };
    });
    return Promise.all(commentPromises);
}
// Example usage:
const storyId = "39540807"; // Replace with the actual story ID
fetchComments(storyId);
