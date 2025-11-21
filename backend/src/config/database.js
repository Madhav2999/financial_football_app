const database = {
  uri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/financial_football',
  options: {
    autoIndex: true,
  },
}

export default database
