process.env.BUCKET = 'test'
process.env.SLACK_INTEGRATOR_SNS = 'test-topic'

const assert = require('assert')
const sinon = require('sinon')
const handler = require('./handler')

describe('Slack event metadata', () => {
  let sandbox = null

  beforeEach(() => sandbox = sinon.sandbox.create())
  afterEach(() => sandbox.restore())

  describe('main', () => {

    it('should save metadata to S3 and send notification', (done) => {
      const putObject = sandbox.stub()
      putObject.yields()

      const publish = sandbox.stub()
      publish.yields()

      const data = {eventId: 'eventId', msg: 'this is a #message with #hashtags', file: 'test/file.jpg'}
      const s3 = {putObject}
      const sns = {publish}

      const expectedOptions = {
        Body: JSON.stringify({
          eventId: 'eventId',
          msg: 'this is a #message with #hashtags',
          file: 'test/file.jpg',
          tags: ['message', 'hashtags']
        }),
        Bucket: 'test',
        Key: 'file.json'
      }

      const expectedNotification = {
        Message: JSON.stringify({
            eventId: 'eventId',
            file: 'test/file.jpg',
            meta: 'test/file.json'
          }),
        TopicArn: 'test-topic'
      }

      handler.main(data, {s3, sns}, (err) => {
        assert.ifError(err)
        assert(putObject.calledOnce)
        assert.deepEqual(putObject.args[0][0], expectedOptions)

        assert(publish.calledOnce)
        assert.deepEqual(publish.args[0][0], expectedNotification)
        done()
      })
    })

    it('should send error notification if metadata save failed', (done) => {
      const putObject = sandbox.stub()
      putObject.yields(new Error('Permission denied'))

      const publish = sandbox.stub()
      publish.yields()

      const data = {eventId: 'eventId', msg: 'message', file: 'test/file.jpg'}
      const s3 = {putObject}
      const sns = {publish}

      const expectedOptions = {
        Body: JSON.stringify({
          eventId: 'eventId',
          msg: 'message',
          file: 'test/file.jpg',
          tags: []
        }),
        Bucket: 'test',
        Key: 'file.json'
      }

      const expectedNotification = {
        Message: JSON.stringify({
            eventId: 'eventId',
            err: 'Permission denied'
          }),
        TopicArn: 'test-topic'
      }

      handler.main(data, {s3, sns}, (err) => {
        assert(err)
        assert.deepEqual(err, new Error('Permission denied'))

        assert(putObject.calledOnce)
        assert.deepEqual(putObject.args[0][0], expectedOptions)

        assert(publish.calledOnce)
        assert.deepEqual(publish.args[0][0], expectedNotification)
        done()
      })
    })

  })
})
