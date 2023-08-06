
import { fromEvent, interval, merge} from 'rxjs';
import { defaultIfEmpty, filter, map, scan, throttleTime} from "rxjs/operators"
import "./style.css";


function main() {
  /**
   * Inside this function you will use the classes and functions from rx.js
   * to add visuals to the svg element in pong.html, animate them, and make them interactive.
   *
   * Study and complete the tasks in observable examples first to get ideas.
   *
   * Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/
   *
   * You will be marked on your functional programming style
   * as well as the functionality that you implement.
   *
   * Document your code!
   */

  /**
   * This is the view for your game to add and update your game elements.
   */
  const svg = document.querySelector("#svgCanvas") as SVGElement & HTMLElement;

  // Example on adding an element
  // const circle = document.createElementNS(svg.namespaceURI, "circle");
  // circle.setAttribute("r", "50");
  // circle.setAttribute("cx", "100");
  // circle.setAttribute("cy", "100");
  // circle.setAttribute(
  //   "style",
  //   "fill: green; stroke: green; stroke-width: 1px;"
  // );
  // svg.appendChild(circle);

  // type for the game state
  type State = Readonly<{
    time:number,
    frog: Body,
    cars: ReadonlyArray<Body>,
    exit:ReadonlyArray<Body>,
    objCount: number,
    gameOver: boolean,
    river: Body,
    planks: ReadonlyArray<Body>,
    score: number,
    highscore: number,
    targets: ReadonlyArray<Body>,
    coins: ReadonlyArray<Body>,
    difficulty: number,
    turtles: ReadonlyArray<Body>,
  }>

  // type for a body in the game eg. plank, car
  type Body = Readonly<{
    id:string,
    x:number,
    y:number,
    height:number,
    width:number,
    delta: {x:number, y:number}
    colour: String,
    createTime: number
  }>


  type Event = 'keydown' | 'keyup' | 'keypress'
  type Key = 'KeyW' | 'KeyS' | 'KeyA' | 'KeyD' | 'Space'

  // classes for the use of the instanceOf operator
  class SpawnCar { constructor(public readonly body:{x:number, y:number,  width:number, deltax:number, colour:String}){}}
  class SpawnPlank { constructor(public readonly body:{x:number, y:number,  width:number, deltax:number, colour:String, type?:String}){}}
  class Tick { constructor(public readonly elapsed:number){}}
  class Move { constructor(public readonly delta:{x: number, y:number}){}}
  class Restart {constructor(){}}

  // initial game state
  const initialState: State = {
    time: 0,
    frog: createFrog(0),
    cars: [],
    exit: [],
    objCount: 0,
    gameOver: false,
    river: <Body>{id: "river", x:-300, y:0, height:270, width:1200, delta:{x:0,y:0}, colour: "aqua", createTime: 0},
    planks: [],
    score:0,
    highscore:0,
    targets: createTargets(0),
    coins: createCoins(0),
    difficulty: 1,  
    turtles: []
  }

  // clock for the game
  // game ticks every 10ms
  const clock = interval(10)
  const gameClock = clock.pipe(map(elapsed=>new Tick(elapsed)))


  // function that takes an input and alters the gamestate accordingly
  const reduceState = (s:State, e: Move | Tick | SpawnCar | SpawnPlank | Restart) => 
    e instanceof Move && !s.gameOver? 
    {...s,
    frog: s.frog.x + e.delta.x < 600 && s.frog.x + e.delta.x >= 0 && s.frog.y + e.delta.y < 600? {...s.frog, x: s.frog.x + e.delta.x, y: s.frog.y + e.delta.y}: s.frog
    }
    : e instanceof SpawnCar? {...s,
      cars: s.cars.concat([createBody(s, e.body.x, e.body.y, e.body.width, e.body.deltax, e.body.colour, "car")]),
      objCount: s.objCount + 1
    }: e instanceof SpawnPlank? e.body.type?{...s,
      turtles: s.turtles.concat([createBody(s, e.body.x, e.body.y, e.body.width, e.body.deltax, e.body.colour, e.body.type)]),
      objCount: s.objCount + 1
    }:{...s,
      planks: s.planks.concat([createBody(s, e.body.x, e.body.y, e.body.width, e.body.deltax, e.body.colour, "plank")]),
      objCount: s.objCount + 1
    }: e instanceof Tick?
      tick(s,e.elapsed)
      : e instanceof Restart && s.gameOver? // game can only be restart if gameOver is true
      {...s, frog: createFrog(s.time), gameOver: false, score:0, highscore: s.score > s.highscore? s.score: s.highscore, targets: createTargets(s.time), coins: createCoins(s.time), difficulty:1} : s
    

  // function to move an obj
  // difficulty scales the speed
  const moveObj = (difficulty: number) => (o:Body) => <Body>{
    ...o,
    x: o.x + o.delta.x * difficulty,
    y: o.y + o.delta.y * difficulty
  }

  // create a body
  function createBody(s:State, x:number, y:number, width:number, deltax:number, colour:String, type:String):Body{
    return {
      id: type + String(s.objCount),
      x: x,
      y: y,
      width: width,
      height: 30,
      delta: {x: deltax, y:0},
      colour: colour,
      createTime: s.time
    }
  }

  // create a frog starting at 30,30
  function  createFrog(time: number):Body{
    return {
      id:"frog",
      x:270,
      y:570,
      height:30,
      width:30,
      delta: {x:0, y:0},
      colour: "green",
      createTime: time
    }
  }

  // creating the end targets
  function createTargets(time:number): Body[]{
    const target = {
      id:"target",
      x:30,
      y:0,
      height:90,
      width:80,
      delta: {x:0, y:0},
      colour: "DarkSeaGreen",
      createTime: time

    }
    return [{...target, id: "target1"}, 
    {...target, id: "target2", x: 30 + target.width + 35}, 
    {...target, id: "target3",  x: 30 + 2* (target.width + 35)},  
    {...target, id: "target4",  x: 30 + 3* (target.width + 35)}, 
    {...target, id: "target5",  x: 30 + 4* (target.width + 35)}]
  }

  // creating the coins
  function createCoins(time:number): Body[]{
    const coin = {
      id:"coin",
      x:0,
      y:0,
      height:20,
      width:20,
      delta: {x:0, y:0},
      colour: "gold",
      createTime: time
    }
    const positions = 
    [{x: 0, y: 570},{x: 30, y: 570},{x: 60, y: 570},{x: 90, y: 570},{x: 120, y: 570},
    {x: 0, y: 270},{x: 60, y: 240},{x: 120, y: 210},{x: 180, y: 180},{x: 240, y: 150},
    {x: 300, y: 120},{x: 360, y: 90},{x: 420, y: 120},{x: 450, y: 150},{x: 480, y: 180}, 
    {x: 540, y: 210},{x: 60, y: 570},{x: 120, y: 570},{x: 180, y: 570},{x: 240, y: 570},]
    return positions.map((pos, index) => <Body>{...coin,id: coin.id + String(index+1), x: pos.x + 5, y:pos.y + 5})
  }

  // function to handle the collisions
  // colliding with the river while not colliding with a plank results in death
  // colliding with a car results in death
  const handleCollisions = (s:State) => {
    const
      // Some array utility functions
      not = <T>(f:(x:T)=>boolean)=>(x:T)=>!f(x),
      mergeMap = <T, U>(
        a: ReadonlyArray<T>,
        f: (a: T) => ReadonlyArray<U>
      ) => Array.prototype.concat(...a.map(f)),


      // Check if 2 bodies collide
      bodiesCollided = ([a,b]:[Body, Body]) => a.x + a.width > b.x && 
      a.x < b.x + b.width &&
      a.y + a.height > b.y &&
      a.y < b.y + b.height,
      

      carCollided = s.cars.filter(car=>bodiesCollided([s.frog,car])).length > 0,
      riverCollided = bodiesCollided([s.river, s.frog]),

      targetCollisions = s.targets.filter(target=>bodiesCollided([s.frog,target])),
      targetCollided = targetCollisions.length > 0,

      activeTurtles = s.turtles.filter(turtle => (s.time - turtle.createTime) %600<= 300 || (s.time - turtle.createTime) %600>= 400),
      plankCollisions = s.planks.concat(activeTurtles).filter(plank=>bodiesCollided([s.frog,plank])),
      plankCollided = plankCollisions.length > 0,

      coinCollisions = s.coins.filter(coin => bodiesCollided([s.frog, coin])),
      coinCollided = coinCollisions.length > 0

      return <State>{
        ...s,
        frog: plankCollided? {...s.frog, delta: plankCollisions[0].delta}: targetCollided? createFrog(s.time) : {...s.frog, delta: {x:0, y:0}},
        gameOver: carCollided || (riverCollided && (!plankCollided && !targetCollided)) ,
        score: targetCollided?s.score + 1000: coinCollided? s.score + 100: s.score, // increase the score if colliding with target or coin
        targets: targetCollided? s.targets.filter(target => target !== targetCollisions[0]) :  s.targets,
        exit: s.exit.concat(targetCollisions).concat(coinCollisions),
        coins: coinCollided? s.coins.filter(coin => coin !== coinCollisions[0]) : s.coins
      }
  }

  // function to handle a tick in the game
  // eg. cars and planks move
  const tick = (s:State, elapsed:number) => {
    const 
      expired = (body:Body) => body.x < 0 - body.width || body.x > 600,
      active = (body:Body) => body.x >= 0 - body.width && body.x <= 600,
      activeTurtle = (turtle:Body) => (s.time - turtle.createTime) %600<= 300 || (s.time - turtle.createTime) %600>= 400,
      
      
      expiredCars:Body[] = s.cars.filter(expired),
      activeCars:Body[] = s.cars.filter(active),
      expiredPlanks:Body[] = s.planks.concat(s.turtles).filter(expired),
      activePlanks:Body[] = s.planks.filter(active),
      activeTurtles:Body[] = s.turtles.filter(active)
      
    return !s.gameOver? handleCollisions({...s,
      frog: moveObj(s.difficulty)(s.frog),
      cars:activeCars.map(moveObj(s.difficulty)),
      exit:expiredCars.concat(expiredPlanks),
      time:elapsed,
      planks: activePlanks.map(moveObj(s.difficulty)),
      turtles: activeTurtles.map(turtle => activeTurtle(turtle)?{...turtle, colour:"lightgreen"}: {...turtle, colour:"transparent"}).map(moveObj(s.difficulty)),
      targets: s.targets.length > 0? s.targets: createTargets(s.time),
      difficulty: s.targets.length === 0? s.difficulty + 1: s.difficulty
    }):{...s,
      frog: moveObj(s.difficulty)(s.frog),
      cars:activeCars.map(moveObj(s.difficulty)),
      exit:expiredCars.concat(expiredPlanks),
      time:elapsed,
      turtles: activeTurtles.map(turtle => activeTurtle(turtle)?{...turtle, colour:"lightgreen"}: {...turtle, colour:"transparent"}).map(moveObj(s.difficulty)),
      planks: activePlanks.map(moveObj(s.difficulty))
    }
  }

  // alters the html do display the elements of the game
  function updateView(state:State): void {
    const frog = document.getElementById("frog")!;
    frog.setAttribute('transform', `translate(${state.frog.x},${state.frog.y})`)
    
    const svg = document.getElementById("svgCanvas")!;
    const front = document.getElementById("front")!;
    const back = document.getElementById("back")!;

    if (!document.getElementById("river")){
      const v = document.createElementNS(svg.namespaceURI, "rect")
        v.setAttribute("id", state.river.id)
        v.setAttribute("x", String(state.river.x))
        v.setAttribute("y", String(state.river.y))
        v.setAttribute("width", String(state.river.width))
        v.setAttribute("height", String(state.river.height))
        v.setAttribute("style", "fill:" + state.river.colour)
        back.appendChild(v)
      }
    const display = (obj:Body) => (node:HTMLElement) => {
      const createView = () => {
        const v = document.createElementNS(svg.namespaceURI, "rect")!;
        v.setAttribute("id", obj.id)
        v.classList.add(obj.id.replace(/[0-9]/g, ''))
        node.appendChild(v)
        return v
      }
      const v = document.getElementById(obj.id) || createView();
      v.setAttribute("x", String(obj.x))
      v.setAttribute("y", String(obj.y))
      v.setAttribute("width", String(obj.width))
      v.setAttribute("height", String(obj.height))
      v.setAttribute("style", "fill:" + obj.colour)
    }

    // displaying cars
    state.cars.forEach(car => display(car)(front))

    // displaying planks
    state.planks.forEach(plank => {display(plank)(back)})

     // displaying turtles
     state.turtles.forEach(turtle => {display(turtle)(back)})

    // displaying targets
      state.targets.forEach(target => {display(target)(back)})

      // displaying coins
      state.coins.forEach(coin => {display(coin)(front)})

      // displaying scores
      if (document.getElementById("scores")){
        document.getElementById("score")!.textContent = `Score: ${state.score}`
        document.getElementById("highscore")!.textContent = `Highscore: ${state.highscore}`
      }
      else {
        const g = document.createElementNS(svg.namespaceURI, "g")
        g.classList.add("scores")
        g.setAttribute("id", "scores")

        const v = document.createElementNS(svg.namespaceURI, "text")
        v.setAttribute("id", "score")
        v.textContent = `Score: ${state.score}`
        v.setAttribute("y", "30")
        g.appendChild(v)

        const u = document.createElementNS(svg.namespaceURI, "text")
        u.setAttribute("id", "highscore")
        u.textContent = `Highscore: ${state.highscore}`
        u.setAttribute("dy", "10%")
        g.appendChild(u)

        front.appendChild(g)
      }


    // removing elements in exit
    state.exit.forEach(o => {
      const v = document.getElementById(o.id)
      if (v) back.contains(v)? back.removeChild(v): front.removeChild(v)
    })

    if(state.gameOver && !document.getElementById("gameover")) {
      const g = document.createElementNS(svg.namespaceURI, "g")
      g.setAttribute("id", "gameover")

      const v = document.createElementNS(svg.namespaceURI, "text")!
      v.textContent = "Game Over"
      v.setAttribute("x", "100")
      v.setAttribute("y", "300")
      v.classList.add("gameover")

      const a = document.createElementNS(svg.namespaceURI, "text")!
      a.textContent = "Press Space to Restart"
      a.setAttribute("x", "150")
      a.setAttribute("y", "400")
      a.classList.add("restart")

      g.append(v);
      g.append(a);
      front.after(g);

     
    }
    else if (!state.gameOver){
      const v = document.getElementById("gameover")
      if (v) svg.removeChild(v)
    }
  }

  // function that creates and observable to observe a key
  const observeKey = <T>(eventName:Event, k:Key, result:()=>T)=>
  fromEvent<KeyboardEvent>(document,eventName)
    .pipe(
      filter(({code})=>code === k),
      throttleTime(150),
      map(result))

      // movement observables
  const 
    moveLeft = observeKey('keydown', 'KeyA', () => new Move({x:-30, y:0})),
    moveRight = observeKey('keydown', 'KeyD', () => new Move({x:30, y:0})),
    moveUp = observeKey('keydown', 'KeyW', () => new Move({x:0, y:-30})),
    moveDown = observeKey('keydown', 'KeyS', () => new Move({x:0, y:30})),
    restart = observeKey('keydown', 'Space', () => new Restart()),
    moves = merge(moveLeft, moveDown, moveRight, moveUp, restart)

      // observables used for spawners
  const 
    row2 = clock.pipe(filter((time)=>time%100===0 || time % 170 === 0),map(_ => new SpawnCar({x:-90, y:510, width:90, deltax: 3, colour: "red" }))),
    row3 = clock.pipe(filter((time)=>time%300===0),map(_ => new SpawnCar({x:-50, y:480, width:50, deltax: 6 , colour: "purple"}))),
    row4 = clock.pipe(filter((time)=>time%400===0),map(_ => new SpawnCar({x:600, y:450, width:100, deltax: -4, colour: "pink"}))),
    row6 = clock.pipe(filter((time)=>time%270===0 || time % 320 === 0),map(_ => new SpawnCar({x:-50, y:390, width:50, deltax: 1 , colour: "pink"}))),
    row7 = clock.pipe(filter((time)=>time%270===0 || time % 320 === 0),map(_ => new SpawnCar({x:600, y:360, width:60, deltax: -1 , colour: "HotPink"}))),
    rows = merge(row2,row3, row4, row6, row7),

    plank1 = clock.pipe(filter((time)=>time%100===0),map(_ => new SpawnPlank({x:-120, y:240, width:120, deltax: 3, colour: "brown" }))),
    plank2 = clock.pipe(filter((time)=>time%400===0),map(_ => new SpawnPlank({x:600, y:210, width:180, deltax: -2, colour: "brown" }))),
    plank3 = clock.pipe(filter((time)=>time%100===0),
      map(time =>time%400!==0? new SpawnPlank({x:-60, y:180, width:60, deltax: 1, colour: "lightgreen" }): new SpawnPlank({x:-60, y:180, width:60, deltax: 1, colour: "lightgreen", type:"turtle"}))),
    plank4 = clock.pipe(filter((time)=>time%400===0),map(_ => new SpawnPlank({x:-210, y:150, width:210, deltax: 1.5, colour: "brown" }))),
    plank5 = clock.pipe(filter((time)=>time%100===0),map(_ => new SpawnPlank({x:600, y:120, width:120, deltax: -3, colour: "brown" }))),
    plank6 = clock.pipe(filter((time)=>time%400===0),map(_ => new SpawnPlank({x:-210, y:90, width:210, deltax: 1, colour: "brown" }))),
    planks = merge(plank1, plank2, plank3, plank4, plank5, plank6)

  
  // running the game
  const game =  merge(gameClock, moves, rows, planks)
  const startGame = (state: State) => game.pipe(scan(reduceState, state)).subscribe(updateView)
 
  const subscription = startGame(initialState)
}


// The following simply runs your main function on window load.  Make sure to leave it in place.
if (typeof window !== "undefined") {
  window.onload = () => {
    main();
  };
}
