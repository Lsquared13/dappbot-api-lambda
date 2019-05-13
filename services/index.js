console.log("Loading Services Index");
module.exports = {
  dynamoDB : require('./dynamoDB'),
  sqs : require('./sqs')
}