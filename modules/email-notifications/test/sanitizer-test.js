'use strict';

const assert = require('assert');
const { sanitizeChatText } = require('../lib/sanitizer');

describe('sanitizer', () => {
  describe('urls need sanitization', () => {
    it('sanitizes urls', () => {
      // raw - sanitized pairs
      const examples = {
        'http://example.com/evil\u202E3pm.exe': 'http://example.com/evil%E2%80%AE3pm.exe',
        'http://one😄two.com': 'http://xn--onetwo-yw74e.com/',
        '[Evil-Test](http://one😄two.com)': '[Evil-Test](http://xn--onetwo-yw74e.com)/',
        'http://\u0261itlab.com': 'http://xn--itlab-qmc.com/',
        '[Evil-GitLab-link](http://\u0261itlab.com)':
          '[Evil-GitLab-link](http://xn--itlab-qmc.com)/'
      };

      Object.entries(examples).forEach(example =>
        assert.equal(sanitizeChatText(example[0]), example[1])
      );
    });

    it('should pick url from text and sanitize it', () => {
      const textExample = `Super pridem, est mihi! A *trabs humanam*; hic tamen simul crimen taedasque
        Danais habes, superorum? *Canes* toto Delius datum
        [dat](http://\u0261itlab.com/), piasque sine secutus, erat harenam contra
        exemplis filia.`;
      assert(
        sanitizeChatText(textExample).indexOf('http://xn--itlab-qmc.com/') !== -1,
        'example paragraph should be sanitized'
      );
    });
  });

  describe('urls that should be left alone', () => {
    it('should not sanitize non-malicious URLs', () => {
      const goodExamples = [
        'http://example.com',
        '[Safe-Test](http://example.com)',
        'https://commons.wikimedia.org/wiki/File:اسكرام_2_-_تمنراست.jpg',
        '[Wikipedia-link](https://commons.wikimedia.org/wiki/File:اسكرام_2_-_تمنراست.jpg)'
      ];
      assert.deepEqual(goodExamples.map(sanitizeChatText), goodExamples);
    });
  });

  describe('sanity check', () => {
    it('should handle large markdown message', () => {
      const largeMessage = `# Cadet petite

          ## Per causas serta unxit una altera perque
          
          Lorem markdownum tamen prosunt est
          [praeceps](http://et-dabitis.org/facitpietasque.html) ignem maxima: delicta
          movet lanigeris gemma, peragat. Legendo et vocem vestigia Nessus corpus densetur
          iuppiter candor pererrant sumpserat orbis contrahitur, erat. Petendo cui sum de
          quam opes caeruleus. O metuenti tamen.
          
          Est quid dares at casu et recurvas, modo, mare quamvis radiis, Minos. Ridet
          vetustos Atlantis et [certam](http://ultra-frequento.com/populos), tacito ut at
          traxit tenebo deprensus, hoc vestes levis Lelex.
          
          1. Quis servat vulnere suorum facilesque palato
          2. Imo etsi nymphae et plenas equorum abdidit
          3. Ei quod quidem
          4. Altissima spargit
          5. Iter vivat bibebatur calamus patrem volucres in
          
          Neque stat lata illuc motu undique, est bellica *utve desere*, hic nutu nuper
          Dorylas pharetras lactentem nunc. Et inter ingredior gratior; eundi tamen
          ingenio: non male mutare.
          
          ## Adopertaque vota
          
          Alis dilecte *mihi*, sidere in inplerit fratres; vel ratae. Ater tantum sic,
          mihi [adsimilare Phocus](http://www.caesa.io/) expers esse viveret mente
          procubuisse Bybli adspicit, ad.
          
              pebibyte.tagSnippet -= excel(stick_multithreading_domain);
              if (cdma_logic >= extranetDriveHover) {
                  shell_cd_vdu.hit.program(driveFacebookZone(5, soundEncryption),
                          telecommunicationsUrlBoot + 4);
              } else {
                  fileIphoneKilobit = ctrCoreText - sectorJava(server_impact_monitor,
                          readerHtml);
              }
              if (party + dvr_boot + byte) {
                  system -= technology_internic;
                  cdma_status_fddi.disk += quad_hardware_proxy(19,
                          ripcording_software_ebook);
              } else {
                  stateCpaScsi -= 72;
              }
          
          Super pridem, est mihi! A *trabs humanam*; hic tamen simul crimen taedasque
          Danais habes, superorum? *Canes* toto Delius datum
          [dat](http://tinnitibushunc.net/), piasque sine secutus, erat harenam contra
          exemplis filia. In ait est genialiter pedem, protinus tantummodo: **agmina
          spectantis** quoque illis lapides simulac, armiferae o. Feruntur ego mora
          relicta si poterat [formam](http://forescantusque.com/sumpsit-atque).
          
          Mora ab condar est deducit mugitibus primis guttura ad, pectus locorum ponere
          albas ab vina ego docebo. Eripuit ramis, tura gaudere, haberet illis tenebrisque
          responsaque inarata causas; hoc? Herba frusta proscindere tantum omnes, non illo
          poscunt [ministro cruento](http://bracchiaqueathenae.net/pendentia.html) visa
          sive Amphione guttura ego [insidiae Teucer](http://laqueoque.org/quisque.php).`;

      assert.equal(sanitizeChatText(largeMessage), largeMessage);
    });
  });
});
