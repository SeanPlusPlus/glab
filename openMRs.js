require('dotenv').config(); // Load environment variables from .env file
const axios = require('axios');

// Get the username from command-line arguments
const username = process.argv[2];  // The third argument is the username

if (!username) {
  console.error('Please provide a username as a command-line argument.');
  process.exit(1);  // Exit the script with an error code
}

const gitlabUrl = process.env.GITLAB_URL;  // Load GitLab URL from environment variables
const personalAccessToken = process.env.GITLAB_PERSONAL_ACCESS_TOKEN; // Load access token from environment variables

async function getOpenMergeRequests() {
  let userId;

  // Get User ID
  try {
    const userResponse = await axios.get(`${gitlabUrl}/api/v4/users?username=${username}`, {
      headers: {
        'PRIVATE-TOKEN': personalAccessToken,
      },
    });

    if (userResponse.data.length === 0) {
      console.log(`User with username ${username} not found`);
      return;
    }

    userId = userResponse.data[0].id;
  } catch (error) {
    console.error('Error fetching user ID:', error.message);
    return; // Exit the function if the user ID cannot be retrieved
  }

  // Get Merge Requests
  try {
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
