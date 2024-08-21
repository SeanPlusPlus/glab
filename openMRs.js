require('dotenv').config();
const axios = require('axios');

const username = process.argv[2];
const state = process.argv[3];  // New parameter for MR state (opened, merged)

if (!username) {
  console.error('Please provide a username as a command-line argument.');
  process.exit(1);
}

if (!state || !['opened', 'merged'].includes(state)) {
  console.error('Please provide a valid MR state ("opened" or "merged") as a command-line argument.');
  process.exit(1);
}

const gitlabUrl = process.env.GITLAB_URL;
const personalAccessToken = process.env.GITLAB_PERSONAL_ACCESS_TOKEN;

async function getMergeRequests() {
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
    return;
  }

  // Get Merge Requests based on state
  try {
    const mrResponse = await axios.get(`${gitlabUrl}/api/v4/merge_requests`, {
      headers: {
        'PRIVATE-TOKEN': personalAccessToken,
      },
      params: {
        state: state,  // Use the state parameter (opened or merged)
        author_id: userId,
      },
    });

    const mergeRequests = await Promise.all(mrResponse.data.map(async (mr) => {
      const projectResponse = await axios.get(`${gitlabUrl}/api/v4/projects/${mr.project_id}`, {
        headers: {
          'PRIVATE-TOKEN': personalAccessToken,
        },
      });

      const mrData = {
        Title: mr.title,
        'Project Name': projectResponse.data.name,
        'Date Opened': new Date(mr.created_at).toLocaleDateString(),
        URL: mr.web_url,
      };
      
      // Calculate the total days open
      const dateOpened = new Date(mr.created_at);
      let totalDaysOpen;
      
      if (state === 'merged') {
        const dateMerged = new Date(mr.merged_at);
        mrData['Date Merged'] = dateMerged.toLocaleDateString();
        totalDaysOpen = Math.round((dateMerged - dateOpened) / (1000 * 60 * 60 * 24));
      } else {
        const today = new Date();
        totalDaysOpen = Math.round((today - dateOpened) / (1000 * 60 * 60 * 24));
      }
      
      mrData['Total Days Open'] = totalDaysOpen;
      
      return mrData;
    }));

    console.table(mergeRequests);
  } catch (error) {
    console.error('Error fetching merge requests or project details:', error.message);
  }
}

getMergeRequests();
