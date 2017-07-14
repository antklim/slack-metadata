'use strict'

const findtags = require('find-hashtags')

/**
 * DEBUG (optional)     - allows debug information logging
 * ERROR (optional)     - allows error information logging
 * BUCKET               - AWS S3 bucket to store file and metadata
 * SLACK_INTEGRATOR_SNS - AWS SNS topic name to send Slack message processing information
 */
const {DEBUG, ERROR, BUCKET, SLACK_INTEGRATOR_SNS} = process.env

const debug = (...args) => (DEBUG) ? console.log.apply(null, args) : null
const error = (...args) => (ERROR) ? console.error.apply(null, args) : null

// data: {eventId, channel, url, msg, file}
exports.main = (data, aws, cb) => {
  debug(`Event data:\n${JSON.stringify(data, null, 2)}`)
  const {eventId,channel, msg, file} = data

  const tags = (msg.indexOf('#') < 0) ? [] : findtags(msg)

  const body = {eventId, msg, file, tags}

  const options = {
    Body: JSON.stringify(body),
    Bucket: BUCKET,
    Key: `${data.file.split('/').pop().split('.').shift()}.json`
   }

   const meta = `${options.Bucket}/${options.Key}`
   debug(`Saving to: ${meta}`)

   aws.s3.putObject(options, (err) => {
     if (err) {
       error(err)
     } else {
       debug(`Saved to: ${meta}`)
     }

     const notification = (err) ?  {eventId, channel, err: err.message} : {eventId, channel, file, meta}
     exports._callSns(aws.sns, SLACK_INTEGRATOR_SNS, notification)
     cb(err)
   })
}

exports._callSns = (sns, topic, notification) => {
  debug(`Sending ${JSON.stringify(notification, null, 2)} to topic: ${SLACK_INTEGRATOR_SNS}`)

  const params = {
    Message: JSON.stringify(notification),
    TopicArn: topic
  }

  sns.publish(params, (err) => {
    if (err) {
      error(`Notification publish to ${topic} failed`)
      error(err)
      return
    }

    debug(`Notification successfully published to ${topic}`)
  })
}
