'use strict';

var assert = require('assert');
var underTest = require('../lib/notification-message-generator');

describe('notification-message-generator', function() {
  it('should generate message for the simple case', function() {
    var message = underTest({ uri: 'gitterHQ/gitter-webapp' }, [
      { id: '00001', text: 'Yo', fromUser: { displayName: 'Mike Bartlett ' } }
    ]);

    assert.equal(message, 'gitterHQ/gitter-webapp  \nMike Bartlett: Yo');
  });

  it('should should not repeat usernames', function() {
    var message = underTest({ uri: 'gitterHQ/gitter-webapp' }, [
      { id: '00001', text: 'Yo', fromUser: { displayName: 'Mike Bartlett ' } },
      { id: '00001', text: 'Moo', fromUser: { displayName: 'Mike Bartlett ' } }
    ]);

    assert.equal(message, 'gitterHQ/gitter-webapp  \nMike Bartlett: Yo  \nMoo');
  });

  it('should generate a message for a one to one', function() {
    var troupe = {
      id: '5395a3c7ade1b7aa68a08e6d',
      name: 'Andy Trevorah',
      oneToOne: true,
      userIds: ['535f8372096160afe0362eba', '538f52b7ade1b7aa68a08e68'],
      url: '/trevorah'
    };
    var items = [
      {
        id: '53b68c9b11e679b683873e12',
        text: 'test message',
        sent: '2014-07-04T11:14:35.188Z',
        mentions: [],
        fromUser: {
          id: '535f8372096160afe0362eba',
          username: 'trevorah',
          displayName: 'Andy Trevorah'
        },
        troupe: false
      }
    ];
    // var smsLink = "http://localhost:5000/trevorah";

    var message = underTest(troupe, items);

    assert.equal(message, 'Andy Trevorah  \ntest message');
  });

  it('should generate message for the double chat case', function() {
    var message = underTest({ uri: 'gitterHQ/gitter-webapp' }, [
      { id: '00001', text: 'Yo', fromUser: { displayName: 'Mike Bartlett ' } },
      { id: '00002', text: 'Hey how are you?', fromUser: { displayName: 'Andrew Newdigate' } }
    ]);
    assert.equal(
      message,
      'gitterHQ/gitter-webapp  \nMike Bartlett: Yo  \nAndrew Newdigate: Hey how are you?'
    );
  });

  it('should truncate really long lines', function() {
    var message = underTest({ uri: 'gitterHQ/gitter-webapp' }, [
      {
        id: '00001',
        text: 'Hey I just wanted to run by those accounts figures with you',
        fromUser: { displayName: 'Mahershalalhashbaz Smith' }
      },
      {
        id: '00002',
        text: 'Why is your name so long?',
        fromUser: { displayName: 'Andrew Newdigate' }
      }
    ]);

    assert.equal(
      message,
      'gitterHQ/gitter-webapp  \nMahershalalhashbaz Smith: Hey I just wanted to run by those accounts figures with you  \nAndrew Newdigate: Why is your name so long?'
    );
  });

  it('should handle really long content', function() {
    var message = underTest({ uri: 'gitterHQ/gitter-webapp' }, [
      { id: '00001', text: 'Freaky', fromUser: { displayName: 'Andrew Newdigate' } },
      {
        id: '00003',
        text: Array(10).join(
          "This is a fairly long message do you not thing. I think it is. I'm quite verbose sometimes when I want to say something."
        ),
        fromUser: { displayName: 'Mike Bartlett ' }
      },
      { id: '00005', text: 'Hey how are you?', fromUser: { displayName: 'Andrew Newdigate' } }
    ]);
    assert.strictEqual(message.length, 1024);
    assert.equal(
      message,
      "gitterHQ/gitter-webapp  \nAndrew Newdigate: Freaky  \nMike Bartlett: This is a fairly long message do you not thing. I think it is. I'm quite verbose sometimes when I want to say something.This is a fairly long message do you not thing. I think it is. I'm quite verbose sometimes when I want to say something.This is a fairly long message do you not thing. I think it is. I'm quite verbose sometimes when I want to say something.This is a fairly long message do you not thing. I think it is. I'm quite verbose sometimes when I want to say something.This is a fairly long message do you not thing. I think it is. I'm quite verbose sometimes when I want to say something.This is a fairly long message do you not thing. I think it is. I'm quite verbose sometimes when I want to say something.This is a fairly long message do you not thing. I think it is. I'm quite verbose sometimes when I want to say something.This is a fairly long message do you not thing. I think it is. I'm quite verbose sometimes when I want to say someth…"
    );
  });

  it('should truncate a second line if it is huge', function() {
    var text1 = Array(200).join('0123456789');

    var message = underTest({ uri: 'gitterHQ/gitter-webapp' }, [
      { id: '00003', text: Array(10).join('ABCDEFGHIJ') },
      { id: '00001', text: text1 }
    ]);
    assert.equal(message.length, 1024);
  });
  it('should truncate a single line if it is huge', function() {
    var text1 = Array(200).join('0123456789');

    var message = underTest({ uri: 'gitterHQ/gitter-webapp' }, [
      { id: '00001', text: text1 },
      { id: '00003', text: Array(10).join('ABCDEFGHIJ') },
      { id: '00005', text: 'Hey how are you?', fromUser: { displayName: 'Andrew Newdigate' } }
    ]);
    assert.equal(message.length, 1024);
  });

  it('should not make the second line too short', function() {
    var text1 = Array(100).join('0123456789');
    assert.strictEqual(text1.length, 990);

    var message = underTest({ uri: 'gitterHQ/gitter-webapp' }, [
      { id: '00001', text: text1 },
      { id: '00003', text: Array(10).join('ABCDEFGHIJ') },
      { id: '00005', text: 'Hey how are you?', fromUser: { displayName: 'Andrew Newdigate' } }
    ]);
    assert(message.length < 1024);
    assert.equal(message, 'gitterHQ/gitter-webapp  \n' + text1);
  });
});
