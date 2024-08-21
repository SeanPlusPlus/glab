require('dotenv').config();
const axios = require('axios');

const username = process.argv[2];
const state = process.argv[3];  // MR state (opened, merged)
const repoIds = process.argv.slice(4, process.argv.length - (state === 'merged' ? 2 : 1)); // List of repository IDs
const pastDate = state === 'merged' ? process.argv[process.argv.length - 2] : null; // Date filter for merged MRs
const outputFlag = state === 'merged' ? process.argv[process.argv.length - 1] : process.argv[process.argv.length - 1]; // Flag for Markdown output

if (!username) {
  console.error('Please provide a username as a command-line argument.');
  process.exit(1);
}

if (!state || !['opened', 'merged'].includes(state)) {
  console.error('Please provide a valid MR state ("opened" or "merged") as a command-line argument.');
  process.exit(1);
}

if (repoIds.length === 0) {
  console.error('Please provide at least one repository ID as a command-line argument.');
  process.exit(1);
}

if (state === 'merged' && !pastDate) {
  console.error('Please provide a past date in the format YYYY-MM-DD to filter merged requests.');
  process.exit(1);
}

const gitlabUrl = process.env.GITLAB_URL;
const personalAccessToken = process.env.GITLAB_PERSONAL_ACCESS_TOKEN;

async function getMergeRequestsForRepos() {
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

    const userId = userResponse.data[0].id;
    const projectsData = {};
    const pastDateObj = pastDate ? new Date(pastDate) : null;

    // Loop through each repo ID and fetch MRs for the specified user
    for (const repoId of repoIds) {
      try {
        const mrResponse = await axios.get(`${gitlabUrl}/api/v4/projects/${repoId}/merge_requests`, {
          headers: {
            'PRIVATE-TOKEN': personalAccessToken,
          },
          params: {
            state: state,
            author_id: userId,
          },
        });

        const projectResponse = await axios.get(`${gitlabUrl}/api/v4/projects/${repoId}`, {
          headers: {
            'PRIVATE-TOKEN': personalAccessToken,
          },
        });

        const projectName = projectResponse.data.name;

        const repoMergeRequests = await Promise.all(mrResponse.data.map(async (mr) => {
          if (state === 'merged' && pastDateObj && new Date(mr.merged_at) < pastDateObj) {
            return null;  // Skip MRs merged before the specified date
          }

          const mrData = {
            Title: `[${mr.title}](${mr.web_url})`, // Markdown link format
          };

          if (state === 'opened') {
            mrData['Date Opened'] = new Date(mr.created_at).toLocaleDateString();
          } else if (state === 'merged') {
            mrData['Date Merged'] = new Date(mr.merged_at).toLocaleDateString();

            const dateOpened = new Date(mr.created_at);
            const totalDaysOpen = Math.round((new Date(mr.merged_at) - dateOpened) / (1000 * 60 * 60 * 24));
            mrData['Total Days Open'] = totalDaysOpen;
          }

          return mrData;
        }));

        // Filter out any null values and group MRs by project
        projectsData[projectName] = repoMergeRequests.filter(Boolean);
      } catch (error) {
        console.error(`Error fetching merge requests for repo ID ${repoId}:`, error.message);
      }
    }

    if (outputFlag === '--md') {
      const mdContent = generateMarkdown(projectsData);
      console.log(mdContent);
    } else {
      Object.keys(projectsData).forEach(projectName => {
        console.log(`\n${projectName}:\n`);
        console.table(projectsData[projectName]);
      });
    }
  } catch (error) {
    console.error('Error fetching user ID:', error.message);
  }
}

function generateMarkdown(data) {
  let md = `# Merge Requests for ${username} (${state})\n\n`;

  Object.keys(data).forEach(projectName => {
    md += `## ${projectName} (${data[projectName].length} MRs)\n\n`;

    if (state === 'opened') {
      md += `| Title | Date Opened |\n`;
      md += `|-------|-------------|\n`;
    } else if (state === 'merged') {
      md += `| Title | Date Merged | Total Days Open |\n`;
      md += `|-------|-------------|-----------------|\n`;
    }

    data[projectName].forEach(row => {
      md += `| ${row.Title} |`;
      if (state === 'opened') {
        md += ` ${row['Date Opened']} |\n`;
      } else if (state === 'merged') {
        md += ` ${row['Date Merged']} | ${row['Total Days Open']} |\n`;
      }
    });

    md += `\n`;
  });

  return md;
}

getMergeRequestsForRepos();
