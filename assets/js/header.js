$(document).ready(function(){
    $(".float-Contents").click(function (e) { 
      $(".float-Element").removeClass("float-Highlight");
      $(".float-Element").addClass("float-Lowlight");
      $(this).parent().removeClass("float-Lowlight");
      $(this).parent().addClass("float-Highlight");

      if($(this).parent().hasClass("float-Physics"))
      {
        $("#tech-tree-physics").removeClass("float-NoDisplay");
        $("#tech-tree-society").addClass("float-NoDisplay");
        $("#tech-tree-engineering").addClass("float-NoDisplay");
      }
      if($(this).parent().hasClass("float-Society"))
      {
        $("#tech-tree-physics").addClass("float-NoDisplay");
        $("#tech-tree-society").removeClass("float-NoDisplay");
        $("#tech-tree-engineering").addClass("float-NoDisplay");
      }
      if($(this).parent().hasClass("float-Engineering"))
      {
        $("#tech-tree-physics").addClass("float-NoDisplay");
        $("#tech-tree-society").addClass("float-NoDisplay");
        $("#tech-tree-engineering").removeClass("float-NoDisplay");
      }
      if($(this).parent().hasClass("float-All"))
      {
        $("#tech-tree-physics").removeClass("float-NoDisplay");
        $("#tech-tree-society").removeClass("float-NoDisplay");
        $("#tech-tree-engineering").removeClass("float-NoDisplay");
      }
      
      
    });

    $("a[href='#top']").click(function() {
        window.scrollTo(0,0);
    });
});