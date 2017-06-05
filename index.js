// var fs = require('fs');
// var ds = require('deepstream.io-client-js')
// var parse = require('csv-parse');


// var client = ds('wss://013.deepstreamhub.com?apiKey=5e25aaea-3b8f-4b80-904b-0cdb65a41a99').login()

// var nasdaqList$ = client.record.getList('nasdaq');

// var i = 0;
// var linesPerWrite = 100;
// var gapBetweenWrites = 500;
// var totalLines = 3000;

// nasdaqList$.whenReady(() => {
//     console.log((nasdaqList$.getEntries()))
//     // nasdaqList$.delete();
//     // client.record.getRecord(`EQ`).delete();
//     if(nasdaqList$.isEmpty()) {
//         readNext()
//     } else {
//         console.log('exist')
//     }
// })

// function readNext() {
//     console.log( `writing lines ${i} to ${i + linesPerWrite}` );

//     populateListRecords(nasdaqList$, function() {
//         console.log(`populated lines ${i} to ${i + linesPerWrite}`);
//     });
    
//     i += linesPerWrite;
//     if( i < totalLines ) {
//         setTimeout( readNext, gapBetweenWrites );
//     } else {
//         console.log( 'done' );
//     }
    
// }

// function populateListRecords(nasdaqList$, cb) {
//     var parser = parse({}, function(err, data){
//         var parsed = [];
//         data.forEach(v => {
//             if(data.indexOf(v) !== 0) {
//                 var value = {
//                     symbol: v[0],
//                     name: v[1],
//                     price: v[2],
//                     sector: v[6]      
//                 }
//                 var nasdaqRec$ = client.record.getRecord(`EQ/${value.symbol}`);
//                 nasdaqRec$.whenReady(() => {
//                     nasdaqRec$.set(value)
//                     nasdaqList$.addEntry(nasdaqRec$.name)
//                 })
//             }
//         })
//         cb()
//     });
//     fs.createReadStream(__dirname+'/companylist.csv').pipe(parser);
// }


// console.log('Running')

const fs = require('fs');
const deepstream = require('deepstream.io-client-js')
const parse = require('csv-parse');

let nasdaqList


function hydrateRecordsAndPopulateList(list, callback) {
  const parser = parse({}, function(err, data) {
    const parsed = []
    let initialLine = true
    let totalEntries = data.length - 1
    let count = 0
    for (let i = 1; i < data.length; i++) {
      const v = data[i]
      const value = {
        symbol: v[0],
        name: v[1],
        price: v[2],
        sector: v[6]
      }
      setTimeout(() => {
        const rec = client.record.getRecord(`EQ/${value.symbol}`);
        rec.whenReady(() => {
          rec.set(value, (err) => {
            console.log('adding', rec.name)
            list.addEntry(rec.name)
            count++
            if (count === totalEntries) {
              console.log('done')
              callback && callback()
            }
          })
        })
      }, i * 5)
    }
  })
  fs.createReadStream(__dirname+'/companylist.csv').pipe(parser);
}


function listAllRecords(list) {
  const entries = list.getEntries()
  console.log(entries.length, 'entries in list')
  entries.forEach((id) => {
    const record = client.record.getRecord(id)
    record.whenReady((record) => {
      //console.log(record.get())
    })
  })
}

function randomStocks(stockList) {
    var range = stockList.length / 30;
    return Array.from({length: Math.floor(range)}, () => stockList[Math.floor(Math.random() * range)]);
}

function startIrregularUpdates(client, stockList) {
    // console.log('random stocks,', randomStocks(stockList))
    randomStocks(stockList).forEach((recName) => {
        var rec = client.record.getRecord(recName);
        // rec.subscribe((data) => {
            // var curStockIndex = stockList.findIndex(x => x.symbol === data.symbol);
            // curStockIndex > -1 && Vue.set(this.stocks, curStockIndex, data)
            // console.log(data)
        // })
        rec.whenReady(() => {
            console.log(rec.get())
          rec.set(Object.assign(rec.get(), {price: (Math.random() * 25).toFixed(2)}))
        })
    })
}

const client = deepstream('wss://013.deepstreamhub.com?apiKey=5a3f811c-1bef-45c4-925d-c0b99b9910e2')
client.login({}, () => {
  nasdaqList = client.record.getList('nasdaq')
  nasdaqList.whenReady((list) => {
    // list.delete()
    console.log(list.getEntries().length)
    if(list.getEntries().length < 1) {
      console.log('ass hole')
      hydrateRecordsAndPopulateList(list, () => setInterval(startIrregularUpdates.bind(null, client, list.getEntries()), 2000))
    } else {
      setInterval(startIrregularUpdates.bind(null, client, list.getEntries()), 2000)
    }
    //listAllRecords(list)
  })
})
.on('connectionStateChanged', connectionState => {
    console.log(connectionState)
})

.on('error', err => console.log(err))