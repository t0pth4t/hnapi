import fetch from "node-fetch"; // You'll need to install 'node-fetch'
import * as fs from "fs";
interface AlgoliaComment {
  comment_text: string | null;
  author: string | null;
  created_at: string; // Example format from Algolia: "2023-12-20T00:31:42.000Z"
  story_id: number | null;
  children: AlgoliaComment[];
}

async function fetchComments(storyId: number): Promise<AlgoliaComment[]> {
  const url = `https://hn.algolia.com/api/v1/search?tags=story_${storyId}&restrictSearchableAttributes=url`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const results = (await response.json()) as { hits: AlgoliaComment[] };
    return results.hits.filter((item) => item.comment_text !== null); // Filter out deleted/empty comments
  } catch (error) {
    console.error("Error fetching comments:", error);
    return [];
  }
}

// ... (Other code and interface from the previous example)

interface ProcessedComment {
  txt: string;
  author: string;
  children: ProcessedComment[];
}

// ... (fetchComments function from the previous example)

async function fetchCommentsRecursive(
  comment: AlgoliaComment
): Promise<ProcessedComment> {
  const processedComment: ProcessedComment = {
    txt: comment.comment_text?.trim() ?? "", // Strip whitespace
    author: comment.author ?? "",
    children: [],
  };

  if (processedComment.txt) {
    // Only process if the comment text is not blank
    if (comment.children) {
      const childPromises = comment.children.map(fetchCommentsRecursive);
      processedComment.children = await Promise.all(childPromises);
    }
  }

  return processedComment;
}

async function fetchAllComments(storyId: number): Promise<ProcessedComment[]> {
  const topLevelComments = await fetchComments(storyId);
  const fetchPromises = topLevelComments.map(fetchCommentsRecursive);
  return Promise.all(fetchPromises);
}
function encodeFilename(filename: string): string {
  return filename.replace(/[^a-z0-9.\-_]/gi, "_");
  // You may customize this encoding if needed
}
async function summarizeAndWriteComments(storyId: number, articleName: string) {
  const comments = await fetchAllComments(storyId);

  // Stringify and minimize comments
  const stringifiedComments = JSON.stringify(comments, null, 0); // No indentation in stringification

  const summaryString = `Summarize the comments of this Hacker News post titled ${articleName}. Comments below:\n${stringifiedComments}`;

  const safeFilename = encodeFilename(articleName) + ".txt"; // Create safe filename

  fs.writeFile(safeFilename, summaryString, (error) => {
    if (error) {
      console.error("Error writing file:", error);
    } else {
      console.log(`Comment summary written to ${safeFilename}`);
    }
  });
}

// Example usage:
const storyId = 39522734;
const articleName =
  "Ask HN: Slow thinkers, how do you compensate for your lack of quick-wittedness?";
//Usage:

summarizeAndWriteComments(storyId, articleName);
