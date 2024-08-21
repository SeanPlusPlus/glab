const axios = require('axios');

// Replace these with your GitLab instance URL and your personal access token
const gitlabUrl = 'https://gitlab.com';  // Replace with your GitLab instance URL
const personalAccessToken = 'your_access_token';  // Replace with your GitLab personal access token
const username = 'specific_user';  // Replace with the username you want to query

async function getOpenMergeRequests() {
  try {
    // Make a request to the GitLab API to get the user ID based on the username
    const userResponse = await axios.get(`${gitlabUrl}/api/v4/users?username=${username}`, {
      headers: {
        'PRIVATE-TOKEN': personalAccessToken,
      },
    });

    if (userResponse.data.length === 0) {
      console.log(`User with username ${username} not found`);
      return;
    }

    const userId = userResponse.data[0].id;

    // Make a request to the GitLab API to get all open MRs for the specific user
    const mrResponse = await axios.get(`${gitlabUrl}/api/v4/merge_requests`, {
      headers: {
        'PRIVATE-TOKEN': personalAccessToken,
      },
      params: {
        state: 'opened',
        author_id: userId,
      },
    });

    const mergeRequests = mrResponse.data;

    if (mergeRequests.length === 0) {
      console.log(`No open merge requests found for user ${username}`);
    } else {
      console.log(`Open Merge Requests for user ${username}:`);
      mergeRequests.forEach((mr) => {
        console.log(`- ${mr.title} (ID: ${mr.id}, Project ID: ${mr.project_id}, URL: ${mr.web_url})`);
      });
    }
  } catch (error) {
    console.error('Error fetching merge requests:', error.message);
  }
}

getOpenMergeRequests();
