const moderatorAccounts = [
  {
    email: 'moderator@financialfootball.test',
    password: process.env.MODERATOR_PASSWORD || 'moderator123',
  },
]
  
const adminAccounts = [
  {
    email: 'admin@financialfootball.test',
    loginId: process.env.ADMIN_LOGIN_ID || 'admin-root',
    displayName: 'Administrator',
    password: process.env.ADMIN_PASSWORD || 'admin123',
  },
]

const accounts = {
  moderatorAccounts,
  adminAccounts,
}

export default accounts
