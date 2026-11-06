const test=require('node:test'),assert=require('node:assert/strict'),fsrs=require('../fsrs.js');
test('initial grades yield ordered stability',()=>{const s=[1,2,3,4].map(g=>fsrs.update(null,g,1000000));assert.ok(s.every(x=>x.d>=1&&x.d<=10&&x.due>1000000));assert.deepEqual(s.map(x=>x.s),[.4,.6,2.4,5.8]);assert.ok(s[3].due>s[0].due)});
test('review increases repetition count and is deterministic',()=>{const x=fsrs.update(null,3,1000000),y=fsrs.update(x,4,1000000+86400000);assert.equal(y.reps,2);assert.equal(y.algorithm,'fsrs-4.5-reference');assert.deepEqual(y,fsrs.update(x,4,1000000+86400000))});
test('retrievability decreases with time',()=>assert.ok(fsrs.retrievability(5,1)>fsrs.retrievability(5,10)));
test('reject invalid grades',()=>assert.throws(()=>fsrs.update(null,0),/grade/));