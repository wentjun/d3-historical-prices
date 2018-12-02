const loadJson = (file, callback) => {
  const xobj = new XMLHttpRequest();
  xobj.overrideMimeType('application/json');
  xobj.open('GET', file, true);
  xobj.onreadystatechange = function() {
    if (xobj.readyState == 4 && xobj.status == '200') {
      // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
      callback(xobj.responseText);
    }
  };
  xobj.send(null);
};
/*
const getData = loadJson('./sti-full.json', text => {
  const data = JSON.parse(text);
  console.log(data);
});
*/

const loadData = d3.json('sti-full.json').then(data => {
  const chartResultsData = data['chart']['result'][0];
  const quoteData = chartResultsData['indicators']['quote'][0];

  return chartResultsData['timestamp'].map((time, index) => ({
    date: new Date(time * 1000),
    high: quoteData['high'][index],
    low: quoteData['low'][index],
    open: quoteData['open'][index],
    close: quoteData['close'][index],
    volume: quoteData['volume'][index]
  }));
});

loadData.then(data => {
  initialiseChart(data);
});

const initialiseChart = data => {
  console.log(data);
  const margin = { top: 50, right: 50, bottom: 50, left: 50 };
  const width = window.innerWidth - margin.left - margin.right; // Use the window's width
  const height = window.innerHeight - margin.top - margin.bottom; // Use the window's height
  const timeFormat = d3.timeFormat('%I:%M %p %a %Y');

  // find data range
  const xMin = d3.min(data, d => {
    return Math.min(d['date']);
  });

  const xMax = d3.max(data, d => {
    return Math.max(d['date']);
  });

  const yMin = d3.min(data, d => {
    return Math.min(d['close']);
  });

  const yMax = d3.max(data, d => {
    return Math.max(d['close']);
  });

  // scale using range
  const xScale = d3
    .scaleTime()
    .domain([xMin, xMax])
    .range([0, width]);

  const yScale = d3
    .scaleLinear()
    .domain([yMin, yMax])
    .range([height, 0]);

  // generates lines when called
  const line = d3
    .line()
    .x(d => {
      return xScale(d['date']);
    })
    .y(d => {
      return yScale(d['close']);
    });

  let movingSum;
  const movingAverageLine = d3
    .line()
    .x(d => {
      return xScale(d['date']);
    })
    .y((d, i) => {
      if (i == 0) {
        return (movingSum = 0);
      } else {
        movingSum += d['close'];
      }
      return yScale(movingSum / i);
    })
    .curve(d3.curveBasis);

  // add chart SVG to the page
  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

  // create an axes components
  svg
    .append('g')
    .attr('id', 'xAxis')
    .attr('transform', `translate(0, ${height})`)
    .call(d3.axisBottom(xScale));

  svg
    .append('g')
    .attr('id', 'yAxis')
    .attr('transform', `translate(${width}, 0)`)
    .call(d3.axisRight(yScale));

  // render lines
  svg
    .append('path')
    .data([data]) // binds data to the line
    .style('fill', 'none')
    .attr('id', 'priceChart')
    .attr('stroke', 'steelblue')
    .attr('d', line);

  svg
    .append('path')
    .data([data])
    .style('fill', 'none')
    .attr('id', 'movingAverageLine')
    .attr('stroke', 'purple')
    .attr('d', movingAverageLine);

  // renders x and y crosshair
  const focus = svg
    .append('g')
    .attr('class', 'focus')
    .style('display', 'none');

  focus.append('circle').attr('r', 4.5);

  focus.append('line').classed('x', true);

  focus.append('line').classed('y', true);

  focus
    .append('text')
    .attr('x', 9)
    .attr('dy', '.35em');

  svg
    .append('rect')
    .attr('class', 'overlay')
    .attr('width', width)
    .attr('height', height)
    .on('mouseover', () => focus.style('display', null))
    .on('mouseout', () => focus.style('display', 'none'))
    .on('mousemove', mousemove);

  d3.select('.overlay').style('fill', 'none');
  d3.select('.overlay').style('pointer-events', 'all');

  d3.selectAll('.focus').style('opacity', 0.7);

  d3.selectAll('.focus line').style('fill', 'none');
  d3.selectAll('.focus line').style('stroke', 'black');
  d3.selectAll('.focus line').style('stroke-width', '1.5px');
  d3.selectAll('.focus line').style('stroke-dasharray', '3 3');

  const bisectDate = d3.bisector(d => d.date).left;

  /* mouseover function to generate crosshair */
  function mousemove() {
    const x0 = xScale.invert(d3.mouse(this)[0]);
    const i = bisectDate(data, x0, 1);
    const d0 = data[i - 1];
    const d1 = data[i];
    const d = x0 - d0['date'] > d1['date'] - x0 ? d1 : d0;
    focus.attr(
      'transform',
      `translate(${xScale(d['date'])}, ${yScale(d['close'])})`
    );

    focus
      .select('line.x')
      .attr('x1', 0)
      .attr('x2', width - xScale(d['date']))
      .attr('y1', 0)
      .attr('y2', 0);

    focus
      .select('line.y')
      .attr('x1', 0)
      .attr('x2', 0)
      .attr('y1', 0)
      .attr('y2', height - yScale(d['close']));

    focus.select('text').text(d['close']);
    updateLegends(d);
  }

  /* Legends */
  const updateLegends = currentData => {
    d3.selectAll('.lineLegend').remove();

    const legendKeys = Object.keys(data[0]);
    var lineLegend = svg
      .selectAll('.lineLegend')
      .data(legendKeys)
      .enter()
      .append('g')
      .attr('class', 'lineLegend')
      .attr('transform', function(d, i) {
        return `translate(0, ${i * 20})`;
      });
    lineLegend
      .append('text')
      .text(d => {
        return `${d}: ${currentData[d]}`;
      })
      .attr('transform', 'translate(15,9)'); //align texts with boxes
  };

  /* Volume series bars */
  const volData = data.filter(d => d['volume'] !== null && d['volume'] !== 0);

  const yMinVolume = d3.min(volData, d => {
    return Math.min(d['volume']);
  });

  const yMaxVolume = d3.max(volData, d => {
    return Math.max(d['volume']);
  });

  const yVolumeScale = d3
    .scaleLinear()
    .domain([yMinVolume, yMaxVolume])
    .range([height, 0]);

  svg
    .selectAll()
    .data(volData)
    .enter()
    .append('rect')
    .attr('x', d => {
      return xScale(d['date']);
    })
    .attr('y', function(d) {
      return yVolumeScale(d['volume']);
    })
    .attr('fill', d => (d.open > d.close ? 'red' : 'green')) // green bar if price is rising during that period, and red when price  is falling
    .attr('width', 1)
    .attr('height', function(d) {
      return height - yVolumeScale(d['volume']);
    });
  // testing axis for volume
  /*
  svg.append('g').call(d3.axisLeft(yVolumeScale));
  */
};

const renderChart = data => {
  const margin = { top: 50, right: 50, bottom: 50, left: 50 };
  const width = window.innerWidth - margin.left - margin.right; // Use the window's width
  const height = window.innerHeight - margin.top - margin.bottom; // Use the window's height
  const timeFormat = d3.timeFormat('%I:%M %p %a %Y');

  // find data range
  const xMin = d3.min(data, d => {
    return Math.min(d['date']);
  });

  const xMax = d3.max(data, d => {
    return Math.max(d['date']);
  });

  const yMin = d3.min(data, d => {
    return Math.min(d['close']);
  });

  const yMax = d3.max(data, d => {
    return Math.max(d['close']);
  });

  // scale using range
  const xScale = d3
    .scaleTime()
    .domain([xMin, xMax])
    .range([0, width]);

  const yScale = d3
    .scaleLinear()
    .domain([yMin, yMax])
    .range([height, 0]);

  // generates lines when called
  const line = d3
    .line()
    .x(d => {
      return xScale(d['date']);
    })
    .y(d => {
      return yScale(d['close']);
    });

  let movingSum;
  const movingAverageLine = d3
    .line()
    .x(d => {
      return xScale(d['date']);
    })
    .y((d, i) => {
      if (i == 0) {
        return (movingSum = 0);
      } else {
        movingSum += d['close'];
      }
      return yScale(movingSum / i);
    })
    .curve(d3.curveBasis);
};

const setOneYear = () => {
  loadData.then(data => {
    const thisYearStartDateEpoch = new Date(
      new Date().getFullYear(),
      0,
      1
    ).valueOf();
    data.map(row => (row['date'] = Math.floor(row['date'].getTime())));
    const res = data.filter(row => {
      if (row['date']) {
        return row['date'] >= thisYearStartDateEpoch;
      }
    });
    res.map(row => (row['date'] = new Date(row['date'])));

    // find data range
    const margin = { top: 50, right: 50, bottom: 50, left: 50 };
    const width = window.innerWidth - margin.left - margin.right; // Use the window's width
    const height = window.innerHeight - margin.top - margin.bottom; // Use the window's height
    const xMin = d3.min(res, d => {
      return Math.min(d['date']);
    });

    const xMax = d3.max(res, d => {
      return Math.max(d['date']);
    });

    const yMin = d3.min(res, d => {
      return Math.min(d['close']);
    });

    const yMax = d3.max(res, d => {
      return Math.max(d['close']);
    });

    const xScale = d3
      .scaleTime()
      .domain([xMin, xMax])
      .range([0, width]);

    const yScale = d3
      .scaleLinear()
      .domain([yMin, yMax])
      .range([height, 0]);

    const line = d3
      .line()
      .x(d => {
        return xScale(d['date']);
      })
      .y(d => {
        return yScale(d['close']);
      });

    const movingAverageLine = d3
      .line()
      .x(d => {
        return xScale(d['date']);
      })
      .y((d, i) => {
        if (i == 0) {
          return (movingSum = 0);
        } else {
          movingSum += d['close'];
        }
        return yScale(movingSum / i);
      })
      .curve(d3.curveBasis);

    const svg = d3.select('#chart').transition();

    svg
      .select('#priceChart') // change the line
      .duration(750)
      .attr('d', line(res));
    svg
      .select('#movingAverageLine') // change the line
      .duration(750)
      .attr('d', movingAverageLine(res));

    d3.selectAll('#xAxis').call(d3.axisBottom(xScale));
    d3.selectAll('#yAxis').call(d3.axisRight(yScale));

    var chart = d3.select('#chart');
    const t = d3.transition().duration(750);
    const volData = res.filter(d => d['volume'] !== null && d['volume'] !== 0);

    const yMinVolume = d3.min(volData, d => {
      return Math.min(d['volume']);
    });

    const yMaxVolume = d3.max(volData, d => {
      return Math.max(d['volume']);
    });

    const yVolumeScale = d3
      .scaleLinear()
      .domain([yMinVolume, yMaxVolume])
      .range([height, 0]);

    //select
    const bars = chart.selectAll('rect').data(res);
    //enter
    bars.enter().append('rect');
    //exit
    bars.exit().remove();
    //update
    bars
      .transition(t)
      .attr('x', d => {
        return xScale(d['date']);
      })
      .attr('y', function(d) {
        return yVolumeScale(d['volume']);
      })
      .attr('fill', d => (d.open > d.close ? 'red' : 'green')) // green bar if price is rising during that period, and red when price  is falling
      .attr('width', 1)
      .attr('height', function(d) {
        return height - yVolumeScale(d['volume']);
      });
  });
};
