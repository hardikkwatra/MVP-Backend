const { makeBadge } = require('badge-maker');
const fs = require('fs');
const path = require('path');

// Badge generation function
const createBadgeWithDescription = (badgeDetails) => {
  const format = {
    label: badgeDetails.label || 'Achievement',
    message: badgeDetails.message || 'Default Message',
    labelColor: badgeDetails.labelColor || '#555',
    color: badgeDetails.color || '#FF4500',
    style: badgeDetails.style || 'flat-square',
  };

  const badgeSvg = makeBadge(format);
  const fileName = path.join(__dirname, 'badges', `${badgeDetails.id}.svg`);

  try {
    fs.writeFileSync(fileName, badgeSvg);
    console.log(`Badge saved as: ${fileName}`);
  } catch (error) {
    console.error(`Error saving badge ${badgeDetails.id}:`, error);
  }

  return {
    id: badgeDetails.id,
    label: badgeDetails.label,
    message: badgeDetails.message,
    description: badgeDetails.description,
    path: fileName,
  };
};

const generateBadges = () => {
  // Ensure the badges directory exists
  const badgesDir = path.join(__dirname, 'badges');
  if (!fs.existsSync(badgesDir)) {
    fs.mkdirSync(badgesDir, { recursive: true });
  }

  // Array of badge definitions
  const badges = [
    {
      id: 'badge_001',
      label: 'Top Contributor',
      message: 'Gold Tier',
      labelColor: '#333',
      color: '#FFD700',
      description: 'Awarded for making the most contributions.',
    },
    {
      id: 'badge_002',
      label: 'Bug Hunter',
      message: 'Elite',
      labelColor: '#444',
      color: '#FF4500',
      description: 'Given for identifying and resolving critical bugs.',
    },
    {
      id: 'badge_003',
      label: 'Mentor',
      message: 'Guide',
      labelColor: '#222',
      color: '#4CAF50',
      description: 'Recognized for mentoring new team members and providing guidance.',
    },
  ];

  const metadataList = [];
  badges.forEach((badge) => {
    const metadata = createBadgeWithDescription(badge);
    metadataList.push(metadata);
  });

  // Save all metadata to badges.json
  const metadataFile = path.join(badgesDir, 'badges.json');
  try {
    fs.writeFileSync(metadataFile, JSON.stringify(metadataList, null, 2));
    console.log(`Metadata saved to ${metadataFile}`);
  } catch (error) {
    console.error(`Error saving metadata file:`, error);
  }
};

generateBadges();
