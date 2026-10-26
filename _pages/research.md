---
layout: personal
title: "Research"
permalink: /research/
body_class: page-research
elastic_demo: true
excerpt: "Questions about active elasticity, tissue deformation, geometry and buckling, and elastic waves, with illustrations from my research."
---

<div class="research-page">
  <header class="research-intro">
    <h1>Research</h1>
    <p>I use continuum mechanics to understand how soft and living matter deforms. I am interested in how activity, geometry, and forces combine to determine the shapes materials adopt and the instabilities they undergo.</p>
  </header>

  <section class="research-topic" aria-labelledby="active-title">
    <div class="research-topic__copy">
      <h2 id="active-title">Elasticity beyond equilibrium</h2>
      <p>I study the mechanics of nonequilibrium solids, with a focus on odd elasticity and large deformations. I am interested in how activity changes the response to loading: which shapes become possible, which instabilities survive, and how the answer differs between two and three dimensions.</p>
    </div>
    <figure class="research-figure">
      <a class="research-figure__link" href="{{ '/images/research/odd-elasticity-response.png' | relative_url }}" aria-label="View the full-size passive and odd elasticity comparison">
        <img src="{{ '/images/research/odd-elasticity-response.png' | relative_url }}" width="1500" height="748" alt="Side-by-side bifurcation diagrams compare a passive square forming rectangular branches with an odd square that rotates and, for matched material parameters, forms parallelogram branches." decoding="async">
      </a>
      <figcaption>The same loading can produce different shapes in passive and odd elastic solids. <a href="https://arxiv.org/abs/2605.02476">Figure source</a>.</figcaption>
    </figure>
  </section>

  <section class="research-topic" aria-labelledby="tissues-title">
    <div class="research-topic__copy">
      <h2 id="tissues-title">How tissues deform</h2>
      <p>I study how living tissues respond to forces and change shape during development. A tissue’s own mechanical properties matter, but so do the neighbouring tissues that push and pull on it. I use simple models to understand how these interactions combine with embryo geometry, from the response of hollow tissues to the coordinated deformation of a developing organ.</p>
    </div>
    <figure class="research-figure">
      <a class="research-figure__link" href="{{ '/images/research/embryo-development-0-20min.png' | relative_url }}" aria-label="View the full-size embryo microscopy images at 0 and 20 minutes">
        <img src="{{ '/images/research/embryo-development-0-20min.png' | relative_url }}" width="1318" height="884" alt="Fluorescence microscopy of a Drosophila embryo at 0 min and 20 min, showing the red-labelled hindgut primordium changing from a ring to a keyhole shape against cyan-labelled nuclei." loading="lazy" decoding="async">
      </a>
      <figcaption>The <i>Drosophila</i> hindgut at 0 min and 20 min, as the keyhole shape emerges. Live-embryo microscopy; scale bar: 100 µm. <a href="https://doi.org/10.1073/pnas.2505160122">Image source</a>.</figcaption>
    </figure>
  </section>

  <section class="research-topic" aria-labelledby="geometry-title">
    <div class="research-topic__copy">
      <h2 id="geometry-title">Geometry and instability</h2>
      <p>Geometry changes the way elastic structures deform and become unstable. I study how curvature, confinement, and thickness alter familiar responses such as buckling and determine which shapes a structure can reach. I am also interested in when simple rod, plate, and shell models remain useful, and when stretching and bending can no longer be treated separately.</p>
    </div>
    <figure class="research-figure">
      <a class="research-figure__link" href="{{ '/images/research/curved-surface-buckling.png' | relative_url }}" aria-label="View the full-size curved-surface buckling figure">
        <img src="{{ '/images/research/curved-surface-buckling.png' | relative_url }}" width="1500" height="835" alt="A straight elastic line buckles on a plane; on a curved surface, the relaxed line can already differ from a geodesic before compression." loading="lazy" decoding="async">
      </a>
      <figcaption>Curvature changes the shapes an elastic line can adopt. <a href="https://doi.org/10.1103/63py-ph5s">Figure source</a>.</figcaption>
    </figure>
  </section>

  <section class="research-topic" aria-labelledby="waves-title">
    <div class="research-topic__copy">
      <h2 id="waves-title">Elastic waves and metamaterials</h2>
      <p>My earlier work focused on elastic waves and mechanical metamaterials. A material’s structure and pre-deformation can control where waves go, how fast they move, and how they are polarized. These questions connect the mechanics of soft materials with the design of structures that guide or redirect elastic waves.</p>
    </div>
    <figure class="research-figure">
      <a class="research-figure__link" href="{{ '/images/research/elastic-waveguiding.jpg' | relative_url }}" aria-label="View the full-size elastic waveguiding figure">
        <img src="{{ '/images/research/elastic-waveguiding.jpg' | relative_url }}" width="1626" height="535" alt="A wave scatters into the bulk at a curved boundary in an unstructured solid; a designed lattice guides it along the curve." loading="lazy" decoding="async">
      </a>
      <figcaption>A structured lattice guides elastic waves along a curved path. <a href="https://doi.org/10.1016/j.jmps.2023.105226">Figure source</a>.</figcaption>
    </figure>
  </section>

  <details class="research-demo" data-elastic-disclosure>
    <summary>A small experiment: deform an elastic sheet</summary>
    <div class="research-demo__content">
      <p>Click and drag a point to see how the surrounding sheet responds. Its outer edges are held fixed.</p>
      <div class="elastic-field" data-elastic-field>
        <canvas aria-label="Interactive linear elastic sheet with fixed outer edges. Use a pointer to drag a local patch; the surrounding grid shows the displacement field."></canvas>
      </div>
      <p class="elastic-field__caption">A simple linear-elastic model, with deformation kept small. The research figures above link to the corresponding papers.</p>
    </div>
  </details>
</div>
